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
  const [connected, setConnected] = useState(false);
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

  useEffect(() => {
    nicknameRef.current = nickname;
  }, [nickname]);

  useEffect(() => {
    // Load history
    const loadHistory = async () => {
      try {
        const res = await api.get('/messages/group/group_chat');
        const history = res.data.map((msg) => ({
          from: msg.senderName,
          message: msg.content,
          time: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAttachment: msg.isAttachment,
          attachmentName: msg.attachmentName,
          attachmentUrl: msg.attachmentUrl,
          attachmentType: msg.attachmentType,
          attachmentSize: msg.attachmentSize
        }));
        setMessages(history);
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
        setConnected(true);
        console.log('Connected to group chat: ' + frame);
        client.subscribe('/topic/messages', (messageOutput) => {
          const body = JSON.parse(messageOutput.body);
          setMessages((prev) => [...prev, {
            from: body.from,
            message: body.message,
            time: body.time,
            isAttachment: body.isAttachment,
            attachmentName: body.attachmentName,
            attachmentUrl: body.attachmentUrl,
            attachmentType: body.attachmentType,
            attachmentSize: body.attachmentSize
          }]);
        });

        client.subscribe('/topic/messages/typing', (messageOutput) => {
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
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      if (localTypingTimeoutRef.current) {
        clearTimeout(localTypingTimeoutRef.current);
      }
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const sendTypingStatus = (typing) => {
    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({
        destination: '/app/grp-chat/typing',
        body: JSON.stringify({
          from: nicknameRef.current,
          typing: typing
        })
      });
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);

    if (stompClientRef.current && stompClientRef.current.connected) {
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
        destination: '/app/grp-chat',
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
          destination: '/app/grp-chat',
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
                    <small>Enter a nickname and message to start the conversation.</small>
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
                    placeholder="Write a message..."
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
