import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function Home() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/api/user/me');
      if (response.data && response.data.status === 'authenticated') {
        setUsername(response.data.username);
        setLoading(false);
      } else {
        navigate('/login');
      }
    } catch (err) {
      navigate('/login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    navigate('/login?logout');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-dark shadow-sm py-3 mb-5">
        <div className="container">
          <span className="navbar-brand fw-bold fs-4 navbar-brand-custom">
            Spring Boot WebSocket Chat
          </span>
          <div className="d-flex align-items-center">
            <span className="text-white-50 me-3">Logged in as: <strong className="text-white">{username}</strong></span>
            <button onClick={handleLogout} className="btn btn-outline-light btn-sm px-3">
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-8 text-center mb-4">
            <h1 className="fw-bold mb-2">Welcome back, {username}!</h1>
            <p className="text-muted fs-5">Select a mode below to enter a chat channel or notification system.</p>
          </div>
        </div>

        <div className="row g-4 justify-content-center">
          {/* Card 1: Stomp Group Chat */}
          <div className="col-md-6 col-lg-5">
            <div className="card border-0 shadow-sm h-100 p-3" style={{ borderRadius: '12px' }}>
              <div className="card-body d-flex flex-column">
                <h4 className="card-title fw-bold text-primary mb-3">Group Chat (STOMP)</h4>
                <p className="card-text text-muted flex-grow-1">
                  Connect using Stomp JS and SockJS protocols to broadcast messages to all users in a group channel.
                </p>
                <Link to="/group-chat" className="btn btn-primary mt-3 w-100 py-2 fw-semibold">
                  Open Channel
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Stomp User to User */}
          <div className="col-md-6 col-lg-5">
            <div className="card border-0 shadow-sm h-100 p-3" style={{ borderRadius: '12px' }}>
              <div className="card-body d-flex flex-column">
                <h4 className="card-title fw-bold text-success mb-3">Private Chat (STOMP)</h4>
                <p className="card-text text-muted flex-grow-1">
                  Start private chat sessions with other active online users. Uses Stomp User-to-User routing and shows live active users.
                </p>
                <Link to="/private-chat" className="btn btn-success mt-3 w-100 py-2 fw-semibold text-white">
                  Open Channel
                </Link>
              </div>
            </div>
          </div>

          {/* Card 3: Raw Web Socket */}
          <div className="col-md-6 col-lg-5">
            <div className="card border-0 shadow-sm h-100 p-3" style={{ borderRadius: '12px' }}>
              <div className="card-body d-flex flex-column">
                <h4 className="card-title fw-bold text-warning mb-3">Plain Web Socket</h4>
                <p className="card-text text-muted flex-grow-1">
                  Communicate using the browser's standard raw WebSocket protocol directly to the spring backend handler without STOMP mappings.
                </p>
                <Link to="/raw-chat" className="btn btn-warning mt-3 w-100 py-2 fw-semibold text-white">
                  Open Channel
                </Link>
              </div>
            </div>
          </div>

          {/* Card 4: SSE Notifications */}
          <div className="col-md-6 col-lg-5">
            <div className="card border-0 shadow-sm h-100 p-3" style={{ borderRadius: '12px' }}>
              <div className="card-body d-flex flex-column">
                <h4 className="card-title fw-bold text-info mb-3">SSE Notifications</h4>
                <p className="card-text text-muted flex-grow-1">
                  Listen for real-time notifications pushed from the server using EventSource / Server-Sent Events, or publish your own notifications.
                </p>
                <Link to="/sse-notifications" className="btn btn-info mt-3 w-100 py-2 fw-semibold text-white">
                  Open Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
