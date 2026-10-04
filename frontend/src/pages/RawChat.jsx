import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const isLocalDev = window.location.port === '5173' || window.location.port === '3000';
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 
  (isLocalDev ? 'ws://localhost:8080/sample-chat/web-socket' : `${wsProtocol}//${window.location.host}/sample-chat/web-socket`);

export default function RawChat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    const loadRawHistory = async () => {
      try {
        const res = await api.get('/messages/group/raw_chat');
        const history = res.data.map((msg) => ({
          system: false,
          text: `[${msg.senderName}]: ${msg.content}`
        }));
        setMessages((prev) => {
          const systems = prev.filter(m => m.system);
          return [...history, ...systems];
        });
      } catch (err) {
        console.error('Failed to load raw history:', err);
      }
    };
    loadRawHistory();

    const token = localStorage.getItem('accessToken');
    const socket = new WebSocket(`${WEBSOCKET_URL}?token=${token}`);

    socket.onopen = () => {
      setConnected(true);
      console.log('Connected to raw websocket server');
      setMessages((prev) => [...prev, { system: true, text: 'Connected to server...' }]);
    };

    socket.onmessage = (event) => {
      console.log('Received raw message:', event.data);
      setMessages((prev) => [...prev, { system: false, text: event.data }]);
    };

    socket.onclose = () => {
      setConnected(false);
      console.log('Raw websocket server connection closed');
      setMessages((prev) => [...prev, { system: true, text: 'Disconnected from server.' }]);
    };

    socket.onerror = (error) => {
      console.error('Raw websocket error:', error);
    };

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
      setMessage('');
    } else {
      alert('Not connected to the raw websocket server.');
    }
  };

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-dark shadow-sm py-3 mb-4">
        <div className="container">
          <Link to="/" className="navbar-brand fw-bold fs-4 navbar-brand-custom">
            &larr; Back to Dashboard
          </Link>
          <span className="badge bg-warning px-3 py-2 text-dark fw-bold">
            Plain Web Socket
          </span>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: '12px' }}>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold text-warning mb-0">Raw Broadcast Channel</h4>
                <span className={`badge ${connected ? 'bg-success' : 'bg-danger'} py-2 px-3`}>
                  {connected ? '● Connected' : '○ Disconnected'}
                </span>
              </div>

              {/* Chat Window */}
              <div className="chat-box mb-4" ref={chatBoxRef}>
                {messages.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    Connecting to server...
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    if (msg.system) {
                      return (
                        <div key={index} className="text-center text-muted small my-2 py-1 bg-light rounded">
                          <i>{msg.text}</i>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={index}
                        className="chat-message received"
                        style={{ maxWidth: '90%' }}
                      >
                        <div className="text-break">{msg.text}</div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="row g-2">
                <div className="col-9 col-md-10">
                  <input
                    type="text"
                    className="form-control form-control-lg"
                    placeholder="Write raw message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <div className="col-3 col-md-2">
                  <button type="submit" className="btn btn-warning text-white btn-lg w-100 fw-bold">
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
