import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api, { API_BASE_URL } from '../utils/api';
import EmojiPicker from '../components/EmojiPicker';

export default function PrivateChat() {
  const [currentUser, setCurrentUser] = useState('');
  const [usersPresence, setUsersPresence] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [chatHistories, setChatHistories] = useState({});
  const [connected, setConnected] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const stompClientRef = useRef(null);
  const chatBoxRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const navigate = useNavigate();

  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutsRef = useRef({});
  const localTypingTimeoutRef = useRef(null);

  const selectedUserRef = useRef(selectedUser);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    // 1. Fetch current logged-in user and initial active users
    api.get('/api/user/me')
      .then((res) => {
        if (res.data && res.data.status === 'authenticated') {
          setCurrentUser(res.data.username);
          setUsersPresence(res.data.usersPresence || []);
          connectWebSocket(res.data.username);
        } else {
          navigate('/login');
        }
      })
      .catch(() => {
        navigate('/login');
      });

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      if (localTypingTimeoutRef.current) {
        clearTimeout(localTypingTimeoutRef.current);
      }
    };
  }, []);

  // Fetch private chat history when selecting a user
  useEffect(() => {
    if (!currentUser || !selectedUser) return;

    const loadPrivateHistory = async () => {
      try {
        const res = await api.get(`/messages/private/${currentUser}/${selectedUser}`);
        const history = res.data.map((msg) => ({
          id: msg.id,
          from: msg.senderName,
          message: msg.content,
          time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          myMsg: msg.senderName === currentUser,
          deliveryStatus: msg.deliveryStatus,
          isAttachment: msg.isAttachment,
          attachmentName: msg.attachmentName,
          attachmentUrl: msg.attachmentUrl,
          attachmentType: msg.attachmentType,
          attachmentSize: msg.attachmentSize
        }));
        setChatHistories((prev) => ({
          ...prev,
          [selectedUser]: history
        }));
      } catch (err) {
        console.error('Failed to load private history:', err);
      }
    };

    loadPrivateHistory();
  }, [selectedUser, currentUser]);

  // Scroll chat box to bottom on message change
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatHistories, selectedUser]);

  const connectWebSocket = (username) => {
    const token = localStorage.getItem('accessToken');
    const socket = new SockJS(`${API_BASE_URL}/chat?token=${token}`);
    
    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        setConnected(true);
        console.log('Connected to private chat broker: ' + frame);

        // Subscribe to user-specific private messages
        client.subscribe('/user/queue/messages', (messageOutput) => {
          const body = JSON.parse(messageOutput.body);
          console.log('Received private message:', body);
          
          const contact = body.myMsg ? selectedUserRef.current : body.from;
          
          if (contact) {
            setChatHistories((prev) => {
              const history = prev[contact] || [];
              const newMsg = {
                id: body.id,
                from: body.from,
                message: body.message,
                time: body.time,
                myMsg: body.myMsg,
                deliveryStatus: body.deliveryStatus,
                isAttachment: body.isAttachment,
                attachmentName: body.attachmentName,
                attachmentUrl: body.attachmentUrl,
                attachmentType: body.attachmentType,
                attachmentSize: body.attachmentSize
              };
              return {
                ...prev,
                [contact]: [...history, newMsg],
              };
            });

            // If we are looking at this user's chat, immediately send read receipt
            if (!body.myMsg && selectedUserRef.current === body.from) {
              client.publish({
                destination: '/app/chat/read',
                body: JSON.stringify({ sender: body.from })
              });
            }
          }
        });

        // Subscribe to read/delivery receipts
        client.subscribe('/user/queue/receipts', (receiptOutput) => {
          const receipt = JSON.parse(receiptOutput.body);
          console.log('Received receipt event:', receipt);
          const { sender, recipient, status, messageIds } = receipt;
          
          // If the event is about messages I sent, update their status
          if (sender === currentUserRef.current) {
            setChatHistories((prev) => {
              const history = prev[recipient] || [];
              const updated = history.map((msg) => {
                if (messageIds.includes(msg.id)) {
                  return { ...msg, deliveryStatus: status };
                }
                return msg;
              });
              return {
                ...prev,
                [recipient]: updated
              };
            });
          }
        });

        // Subscribe to active users updates
        client.subscribe('/topic/active', (messageOutput) => {
          const userList = JSON.parse(messageOutput.body);
          console.log('User presence update:', userList);
          setUsersPresence(userList);
        });

        // Subscribe to user-specific private typing events
        client.subscribe('/user/queue/typing', (messageOutput) => {
          const body = JSON.parse(messageOutput.body);
          console.log('Received private typing event:', body);
          const { from, typing } = body;

          setTypingUsers((prev) => {
            if (typing) {
              if (typingTimeoutsRef.current[from]) {
                clearTimeout(typingTimeoutsRef.current[from]);
              }
              typingTimeoutsRef.current[from] = setTimeout(() => {
                setTypingUsers((current) => current.filter((u) => u !== from));
                delete typingTimeoutsRef.current[from];
              }, 3000);

              if (prev.includes(from)) return prev;
              return [...prev, from];
            } else {
              if (typingTimeoutsRef.current[from]) {
                clearTimeout(typingTimeoutsRef.current[from]);
                delete typingTimeoutsRef.current[from];
              }
              return prev.filter((u) => u !== from);
            }
          });
        });
      },
      onDisconnect: () => {
        setConnected(false);
        console.log('Disconnected from private chat broker');
      },
      onStompError: (frame) => {
        console.error('Stomp error:', frame);
      }
    });

    client.activate();
    stompClientRef.current = client;
  };

  const sendTypingStatus = (typing) => {
    if (stompClientRef.current && stompClientRef.current.connected && selectedUserRef.current) {
      stompClientRef.current.publish({
        destination: '/app/chat/typing',
        body: JSON.stringify({
          from: currentUserRef.current,
          typing: typing,
          recipient: selectedUserRef.current
        })
      });
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);

    if (stompClientRef.current && stompClientRef.current.connected && selectedUser) {
      if (!isTyping) {
        setIsTyping(true);
        sendTypingStatus(true);
      }

      if (localTypingTimeoutRef.current) {
        clearTimeout(localTypingTimeoutRef.current);
      }

      localTypingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTypingStatus(false);
      }, 2500);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (!selectedUser) {
      alert('Please select an active user first.');
      return;
    }

    if (stompClientRef.current && stompClientRef.current.connected) {
      const payload = {
        from: currentUser,
        text: message,
        recipient: selectedUser
      };

      stompClientRef.current.publish({
        destination: '/app/chat',
        body: JSON.stringify(payload)
      });

      if (localTypingTimeoutRef.current) {
        clearTimeout(localTypingTimeoutRef.current);
      }
      setIsTyping(false);
      sendTypingStatus(false);

      setMessage('');
      setShowEmojiPicker(false);
    } else {
      alert('Not connected to the chat server.');
    }
  };

  const handleEmojiSelect = (emoji) => {
    const input = messageInputRef.current;
    if (!input) {
      setMessage((prev) => prev + emoji);
      return;
    }
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    setMessage(before + emoji + after);
    
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedUser) {
      alert('Please select an active user first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/api/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const fileMetadata = res.data;

      if (stompClientRef.current && stompClientRef.current.connected) {
        const payload = {
          from: currentUser,
          text: `Sent a file: ${fileMetadata.attachmentName}`,
          recipient: selectedUser,
          isAttachment: true,
          attachmentName: fileMetadata.attachmentName,
          attachmentPath: fileMetadata.attachmentPath,
          attachmentType: fileMetadata.attachmentType,
          attachmentSize: fileMetadata.attachmentSize,
        };

        stompClientRef.current.publish({
          destination: '/app/chat',
          body: JSON.stringify(payload),
        });
      }
    } catch (err) {
      console.error('File upload failed:', err);
      alert(err.response?.data || 'Failed to upload file.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const renderMessageContent = (msg) => {
    if (msg.isAttachment) {
      const downloadUrl = msg.attachmentUrl ? `${API_BASE_URL}${msg.attachmentUrl}` : null;
      const formattedSize = msg.attachmentSize
        ? (msg.attachmentSize / 1024 < 1024
            ? `${(msg.attachmentSize / 1024).toFixed(1)} KB`
            : `${(msg.attachmentSize / (1024 * 1024)).toFixed(1)} MB`)
        : 'Unknown size';

      if (msg.attachmentType === 'IMAGE') {
        return (
          <div className="file-attachment image-attachment">
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" download={msg.attachmentName}>
              <img
                src={downloadUrl}
                alt={msg.attachmentName}
                className="img-fluid rounded mb-1"
                style={{ maxHeight: '200px', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
              />
            </a>
            <div className="small text-white-50">{msg.attachmentName} ({formattedSize})</div>
          </div>
        );
      }

      if (msg.attachmentType === 'VIDEO') {
        return (
          <div className="file-attachment video-attachment">
            <video
              src={downloadUrl}
              controls
              className="w-100 rounded mb-1"
              style={{ maxHeight: '250px', display: 'block' }}
            />
            <div className="small text-white-50">{msg.attachmentName} ({formattedSize})</div>
          </div>
        );
      }

      let icon = '📁';
      if (msg.attachmentType === 'PDF') icon = '📕';
      else if (msg.attachmentType === 'WORD') icon = '📘';
      else if (msg.attachmentType === 'ZIP') icon = '📦';

      return (
        <div className="file-attachment doc-attachment p-2 rounded bg-light border d-flex align-items-center" style={{ minWidth: '220px' }}>
          <span style={{ fontSize: '1.75rem' }} className="me-2">{icon}</span>
          <div className="flex-grow-1 text-truncate" style={{ minWidth: 0 }}>
            <div className="fw-semibold text-truncate small" title={msg.attachmentName} style={{ color: '#2d3748' }}>{msg.attachmentName}</div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>{formattedSize}</div>
          </div>
          <a
            href={downloadUrl}
            download={msg.attachmentName}
            className="btn btn-sm btn-outline-success ms-2 px-2 py-1"
            style={{ fontSize: '0.8rem' }}
          >
            ⬇️
          </a>
        </div>
      );
    }
    return <div className="text-break">{msg.message}</div>;
  };

  const handleSelectUser = (user) => {
    if (stompClientRef.current && stompClientRef.current.connected && selectedUser) {
      stompClientRef.current.publish({
        destination: '/app/chat/typing',
        body: JSON.stringify({
          from: currentUser,
          typing: false,
          recipient: selectedUser
        })
      });
    }
    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({
        destination: '/app/chat/read',
        body: JSON.stringify({ sender: user })
      });
    }
    if (localTypingTimeoutRef.current) {
      clearTimeout(localTypingTimeoutRef.current);
    }
    setIsTyping(false);

    setSelectedUser(user);
  };

  const activeMessages = selectedUser ? (chatHistories[selectedUser] || []) : [];

  const filteredUsers = usersPresence.filter((u) => u.username !== currentUser);
  const onlineUsers = filteredUsers.filter((u) => u.online);
  const offlineUsers = filteredUsers.filter((u) => !u.online);

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-dark shadow-sm py-3 mb-4">
        <div className="container">
          <Link to="/" className="navbar-brand fw-bold fs-4 navbar-brand-custom">
            &larr; Back to Dashboard
          </Link>
          <div className="d-flex align-items-center">
            <span className="text-white-50 me-3">User: <strong className="text-white">{currentUser}</strong></span>
            <span className={`badge ${connected ? 'bg-success' : 'bg-danger'} py-2 px-3`}>
              {connected ? '● Connected' : '○ Disconnected'}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="container">
        <div className="row g-4">
          {/* Active Users Sidebar */}
          <div className="col-md-4">
            <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: '12px', minHeight: '520px' }}>
              <h4 className="fw-bold mb-3 text-secondary">User Presence</h4>
              {filteredUsers.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <p className="mb-0">No users found.</p>
                </div>
              ) : (
                <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
                  {/* Online Users */}
                  <div className="mb-4">
                    <h6 className="text-success fw-bold text-uppercase mb-2 px-1" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>
                      ● Online ({onlineUsers.length})
                    </h6>
                    {onlineUsers.length === 0 ? (
                      <p className="text-muted small px-1 mb-0">No users online</p>
                    ) : (
                      <div className="list-group list-group-flush">
                        {onlineUsers.map((u, idx) => (
                          <button
                            key={`online-${idx}`}
                            onClick={() => handleSelectUser(u.username)}
                            className={`list-group-item list-group-item-action border-0 px-3 py-2.5 my-1 rounded d-flex align-items-center active-user-item ${selectedUser === u.username ? 'active text-white' : ''}`}
                            style={{ fontSize: '1.05rem', fontWeight: '500' }}
                          >
                            <span className="me-2" style={{ color: selectedUser === u.username ? '#fff' : '#198754' }}>●</span>
                            <span className="flex-grow-1 text-truncate">{u.username}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Offline Users */}
                  <div>
                    <h6 className="text-muted fw-bold text-uppercase mb-2 px-1" style={{ fontSize: '0.8rem', letterSpacing: '1px' }}>
                      ○ Offline ({offlineUsers.length})
                    </h6>
                    {offlineUsers.length === 0 ? (
                      <p className="text-muted small px-1 mb-0">No users offline</p>
                    ) : (
                      <div className="list-group list-group-flush">
                        {offlineUsers.map((u, idx) => (
                          <button
                            key={`offline-${idx}`}
                            onClick={() => handleSelectUser(u.username)}
                            className={`list-group-item list-group-item-action border-0 px-3 py-2.5 my-1 rounded d-flex flex-column align-items-start active-user-item ${selectedUser === u.username ? 'active text-white' : ''}`}
                            style={{ fontSize: '1.05rem', fontWeight: '500' }}
                          >
                            <div className="d-flex align-items-center w-100">
                              <span className="me-2 text-muted">○</span>
                              <span className="flex-grow-1 text-truncate">{u.username}</span>
                            </div>
                            <small className={selectedUser === u.username ? 'text-white-50 mt-1' : 'text-muted mt-1'} style={{ fontSize: '0.75rem' }}>
                              Last seen: {formatLastSeen(u.lastSeen)}
                            </small>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Window Column */}
          <div className="col-md-8">
            <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: '12px', minHeight: '520px' }}>
              {selectedUser ? (
                <div className="d-flex flex-column h-100">
                  <div className="border-bottom pb-2 mb-3">
                    <h4 className="fw-bold text-success mb-1">Chat with {selectedUser}</h4>
                    <span className="text-muted small">Private encrypted STOMP tunnel</span>
                  </div>

                  {/* Message History */}
                  <div className="chat-box mb-3 flex-grow-1" ref={chatBoxRef} style={{ height: '340px' }}>
                    {activeMessages.length === 0 ? (
                      <div className="text-center text-muted py-5">
                        <p className="mb-0">No messages in this chat yet.</p>
                        <small>Say hello to {selectedUser}!</small>
                      </div>
                    ) : (
                      activeMessages.map((msg, index) => (
                        <div
                          key={index}
                          className={`chat-message ${msg.myMsg ? 'sent' : 'received'}`}
                        >
                          {renderMessageContent(msg)}
                          <div className="meta d-flex justify-content-end align-items-center">
                            <span>{msg.time}</span>
                            {msg.myMsg && (
                              <span className="read-receipt d-inline-flex align-items-center">
                                {msg.deliveryStatus === 'SENT' && <span className="text-white-50">✓</span>}
                                {msg.deliveryStatus === 'DELIVERED' && <span className="text-white-50">✓✓</span>}
                                {msg.deliveryStatus === 'READ' && <span style={{ color: '#a5f3fc', fontWeight: 'bold' }}>✓✓</span>}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Typing Indicator */}
                  {typingUsers.includes(selectedUser) && (
                    <div className="text-muted small mb-2 ms-1" style={{ fontStyle: 'italic' }}>
                      {selectedUser} is typing...
                    </div>
                  )}

                  {/* Send Input */}
                  <div className="position-relative mt-auto">
                    {showEmojiPicker && (
                      <EmojiPicker
                        onEmojiSelect={handleEmojiSelect}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    )}
                    <form onSubmit={handleSendMessage} className="d-flex align-items-center g-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-lg me-2"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach File"
                      >
                        📎
                      </button>
                      <button
                        type="button"
                        className={`btn btn-lg me-2 ${showEmojiPicker ? 'btn-success text-white' : 'btn-outline-secondary'}`}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Emojis"
                      >
                        😊
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                      <input
                        type="text"
                        ref={messageInputRef}
                        className="form-control form-control-lg me-2"
                        placeholder={`Message ${selectedUser}...`}
                        value={message}
                        onChange={handleInputChange}
                      />
                      <button type="submit" className="btn btn-success text-white btn-lg fw-bold px-4">
                        Send
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="d-flex flex-column justify-content-center align-items-center h-100 text-muted py-5" style={{ minHeight: '400px' }}>
                  <span style={{ fontSize: '3.5rem' }}>💬</span>
                  <h4 className="fw-bold mt-3">No Chat Selected</h4>
                  <p>Click on an active user in the sidebar to begin messaging.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
