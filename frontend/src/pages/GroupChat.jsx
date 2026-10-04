import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api, { API_BASE_URL } from '../utils/api';
import EmojiPicker from '../components/EmojiPicker';

export default function GroupChat() {
  const [nickname, setNickname] = useState(localStorage.getItem('username') || '');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [attachmentUrls, setAttachmentUrls] = useState({});
  const [connected, setConnected] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const stompClientRef = useRef(null);
  const chatBoxRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);

  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutsRef = useRef({});
  const localTypingTimeoutRef = useRef(null);
  const nicknameRef = useRef(nickname);

  const loadRooms = async () => {
    try {
      const res = await api.get('/api/groups');
      const availableRooms = res.data || [];
      setRooms(availableRooms);
      setCurrentRoom((previousRoom) => {
        const updatedCurrentRoom = previousRoom
          ? availableRooms.find((room) => room.id === previousRoom.id)
          : availableRooms.find((room) => room.members?.includes(nicknameRef.current));
        if (!updatedCurrentRoom) return previousRoom;
        return JSON.stringify(previousRoom) === JSON.stringify(updatedCurrentRoom)
          ? previousRoom
          : updatedCurrentRoom;
      });
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  };

  const joinRoom = async (roomId) => {
    try {
      const res = await api.post(`/api/groups/${roomId}/join`);
      setRooms((prev) => prev.map((room) => room.id === res.data.id ? res.data : room));
      if (res.data.member) {
        setCurrentRoom(res.data);
      } else {
        alert('Join request sent. The group admin must approve you.');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to join this group.');
    }
  };

  const approveMember = async (roomId, username) => {
    try {
      const res = await api.post(`/api/groups/${roomId}/members/${encodeURIComponent(username)}/approve`);
      setRooms((prev) => prev.map((room) => room.id === res.data.id ? res.data : room));
      if (currentRoom?.id === res.data.id) setCurrentRoom(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to approve member.');
    }
  };

  const removeMember = async (roomId, username) => {
    if (!window.confirm(`Remove ${username} from this group?`)) return;
    try {
      const res = await api.delete(`/api/groups/${roomId}/members/${encodeURIComponent(username)}`);
      setRooms((prev) => prev.map((room) => room.id === res.data.id ? res.data : room));
      if (currentRoom?.id === res.data.id) setCurrentRoom(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to remove member.');
    }
  };

  const deleteRoom = async (roomId) => {
    if (!window.confirm('Delete this group and its membership?')) return;
    try {
      await api.delete(`/api/groups/${roomId}`);
      setRooms((prev) => prev.filter((room) => room.id !== roomId));
      if (currentRoom?.id === roomId) {
        setCurrentRoom(null);
        setMessages([]);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to delete group.');
    }
  };

  const createRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      const res = await api.post('/api/groups', { name: newRoomName.trim() });
      setRooms((prev) => [...prev, res.data]);
      setCurrentRoom(res.data);
      setNewRoomName('');
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to create this group.');
    }
  };

  useEffect(() => {
    nicknameRef.current = nickname;
  }, [nickname]);

  useEffect(() => {
    loadRooms();
    const refreshTimer = setInterval(loadRooms, 3000);
    return () => clearInterval(refreshTimer);
  }, []);

  useEffect(() => {
    if (!currentRoom) return undefined;
    const roomId = currentRoom.id;
    let cancelled = false;
    setMessages([]);
    setTypingUsers([]);

    // Load history for the selected room.
    const loadHistory = async () => {
      try {
        const res = await api.get(`/messages/group/${roomId}`);
        if (cancelled) return;
        const history = res.data.map((msg) => ({
          id: msg.id,
          from: msg.senderName,
          message: msg.content,
          time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAttachment: msg.isAttachment,
          attachmentName: msg.attachmentName,
          attachmentUrl: msg.attachmentUrl,
          attachmentType: msg.attachmentType,
          attachmentSize: msg.attachmentSize
        }));
        setMessages((currentMessages) => {
          const merged = [...history, ...currentMessages];
          const seen = new Set();
          return merged.filter((msg) => {
            const key = msg.id != null
              ? `id:${msg.id}`
              : `${msg.from}|${msg.message}|${msg.time}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    loadHistory();

    const token = localStorage.getItem('accessToken');
    const socket = new SockJS(`${API_BASE_URL}/grp-chat?token=${token}`);
    
    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        if (cancelled) return;
        setConnected(true);
        console.log('Connected to group chat: ' + frame);
        client.subscribe(`/topic/groups/${roomId}`, (messageOutput) => {
          const body = JSON.parse(messageOutput.body);
          const incoming = {
            id: body.id,
            from: body.from,
            message: body.message,
            time: body.time,
            isAttachment: body.isAttachment,
            attachmentName: body.attachmentName,
            attachmentUrl: body.attachmentUrl,
            attachmentType: body.attachmentType,
            attachmentSize: body.attachmentSize
          };
          setMessages((prev) => {
            if (incoming.id != null && prev.some((msg) => msg.id === incoming.id)) {
              return prev;
            }
            return [...prev, incoming];
          });
        });

        client.subscribe(`/topic/groups/${roomId}/typing`, (messageOutput) => {
          const body = JSON.parse(messageOutput.body);
          const { from, typing } = body;
          if (from === nicknameRef.current) return;

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
        console.log('Disconnected');
      },
      onStompError: (frame) => {
        console.error('Broker error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
      }
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      cancelled = true;
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      if (localTypingTimeoutRef.current) {
        clearTimeout(localTypingTimeoutRef.current);
      }
    };
  }, [currentRoom]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    const urls = {};
    const attachmentMessages = messages.filter((msg) => msg.isAttachment && msg.attachmentUrl);

    Promise.all(attachmentMessages.map(async (msg) => {
      try {
        const response = await api.get(msg.attachmentUrl, { responseType: 'blob' });
        urls[msg.attachmentUrl] = URL.createObjectURL(response.data);
      } catch (err) {
        console.error('Failed to load attachment:', err);
      }
    })).then(() => {
      if (!cancelled) setAttachmentUrls(urls);
    });

    return () => {
      cancelled = true;
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [messages]);

  const sendTypingStatus = (typing) => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({
        destination: `/app/grp-chat/${currentRoom?.id}/typing`,
        body: JSON.stringify({
          from: nicknameRef.current,
          typing: typing
        })
      });
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);

    if (stompClientRef.current && stompClientRef.current.connected && currentRoom) {
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
    if (!nickname.trim()) {
      alert('Please enter a nickname first.');
      return;
    }

    if (stompClientRef.current && stompClientRef.current.connected) {
      const payload = {
        from: nickname,
        text: message
      };
      stompClientRef.current.publish({
        destination: `/app/grp-chat/${currentRoom.id}`,
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

    if (!nickname.trim()) {
      alert('Please enter a nickname first.');
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
          from: nickname,
          text: `Sent a file: ${fileMetadata.attachmentName}`,
          isAttachment: true,
          attachmentName: fileMetadata.attachmentName,
          attachmentPath: fileMetadata.attachmentPath,
          attachmentType: fileMetadata.attachmentType,
          attachmentSize: fileMetadata.attachmentSize,
        };

        stompClientRef.current.publish({
          destination: `/app/grp-chat/${currentRoom.id}`,
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
      const downloadUrl = msg.attachmentUrl ? attachmentUrls[msg.attachmentUrl] : null;
      const formattedSize = msg.attachmentSize
        ? (msg.attachmentSize / 1024 < 1024
            ? `${(msg.attachmentSize / 1024).toFixed(1)} KB`
            : `${(msg.attachmentSize / (1024 * 1024)).toFixed(1)} MB`)
        : 'Unknown size';

      if (msg.attachmentType === 'IMAGE') {
        return (
          <div className="file-attachment image-attachment text-start">
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
          <div className="file-attachment video-attachment text-start">
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
        <div className="file-attachment doc-attachment p-2 rounded bg-light border d-flex align-items-center text-start" style={{ minWidth: '220px' }}>
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

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-dark shadow-sm py-3 mb-4">
        <div className="container">
          <Link to="/" className="navbar-brand fw-bold fs-4 navbar-brand-custom">
            &larr; Back to Dashboard
          </Link>
          <span className="badge bg-success px-3 py-2">
            STOMP Group Chat
          </span>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="container">
        <div className="row g-4 mb-4">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '12px' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Group channels</h5>
                <span className="text-muted small">{rooms.length} available</span>
              </div>
              <div className="d-flex flex-wrap gap-2 mb-3">
                {rooms.map((room) => (
                  <div key={room.id} className="d-flex align-items-center gap-1">
                    <button
                      type="button"
                      className={`btn ${currentRoom?.id === room.id ? 'btn-success' : 'btn-outline-success'}`}
                      onClick={() => room.member ? setCurrentRoom(room) : joinRoom(room.id)}
                    >
                      {room.name} ({room.members?.length || 0})
                    </button>
                    {room.canManage && (
                      <button type="button" className="btn btn-outline-danger" onClick={() => deleteRoom(room.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <form onSubmit={createRoom} className="d-flex gap-2">
                <input
                  className="form-control"
                  placeholder="New group name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  maxLength={80}
                />
                <button className="btn btn-primary" type="submit">Create</button>
              </form>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: '12px' }}>
              <h5 className="fw-bold">Members</h5>
              {currentRoom ? (
                <div className="d-flex flex-wrap gap-2">
                  {currentRoom.members?.map((member) => (
                    <span className="badge bg-secondary d-inline-flex align-items-center gap-1" key={member}>
                      {member}{member === currentRoom.owner ? ' (owner)' : ''}
                      {currentRoom.canManage && member !== currentRoom.owner && (
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-white p-0"
                          onClick={() => removeMember(currentRoom.id, member)}
                          title={`Remove ${member}`}
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              ) : <p className="text-muted mb-0">Join a group to see its members.</p>}
            </div>
          </div>
        </div>
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: '12px' }}>
              <div className="row g-3 align-items-center mb-4">
                <div className="col-md-8">
                  <label htmlFor="nickname" className="form-label fw-bold text-secondary">Your Nickname</label>
                  <input
                    type="text"
                    id="nickname"
                    className="form-control form-control-lg bg-light border-0"
                    placeholder="Choose a nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </div>
                <div className="col-md-4 text-md-end mt-4">
                  <span className={`badge ${connected ? 'bg-success' : 'bg-danger'} py-2 px-3`}>
                    {connected ? '● Connected' : '○ Disconnected'}
                  </span>
                </div>
              </div>

              {/* Chat Window */}
              <div className="chat-box mb-4" ref={chatBoxRef}>
                {messages.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    <p className="mb-0">No messages in this room yet.</p>
                    <small>{currentRoom ? `Join ${currentRoom.name} and start the conversation.` : 'Create or join a group to start chatting.'}</small>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`chat-message ${msg.from === nickname ? 'sent' : 'received'}`}
                    >
                      <div className="fw-semibold small mb-1">{msg.from}</div>
                      {renderMessageContent(msg)}
                      <div className="meta">{msg.time}</div>
                    </div>
                  ))
                )}
                {currentRoom?.canManage && currentRoom.pendingMembers?.length > 0 && (
                  <div className="mt-3">
                    <h6>Pending requests</h6>
                    {currentRoom.pendingMembers.map((member) => (
                      <div className="d-flex justify-content-between align-items-center mb-2" key={member}>
                        <span>{member}</span>
                        <button className="btn btn-sm btn-primary" onClick={() => approveMember(currentRoom.id, member)}>
                          Approve
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <div className="text-muted small mb-2 ms-1" style={{ fontStyle: 'italic' }}>
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}

              {/* Input Form */}
              <div className="position-relative">
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
                    className={`btn btn-lg me-2 ${showEmojiPicker ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
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
                    placeholder={currentRoom ? 'Write a message...' : 'Join a group first'}
                    value={message}
                    onChange={handleInputChange}
                  />
                  <button type="submit" className="btn btn-primary btn-lg fw-bold px-4">
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
