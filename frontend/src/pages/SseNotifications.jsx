import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api, { API_BASE_URL } from '../utils/api';

export default function SseNotifications() {
  const [notificationText, setNotificationText] = useState('');
  const [receivedEvents, setReceivedEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const logBoxRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const source = new EventSource(`${API_BASE_URL}/sse/subscribe?token=${token}`);

    source.onopen = () => {
      setConnected(true);
      console.log('SSE connection successfully opened');
    };

    source.addEventListener('group1', (event) => {
      console.log('Received SSE event (group1):', event.data);
      const time = new Date().toLocaleTimeString();
      setReceivedEvents((prev) => [...prev, { time, data: event.data }]);
    });

    source.onerror = (err) => {
      console.error('SSE connection error:', err);
      setConnected(false);
    };

    eventSourceRef.current = source;

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [receivedEvents]);

  const handlePublishNotification = async (e) => {
    e.preventDefault();
    if (!notificationText.trim()) return;

    try {
      await api.get('/sse/add-event', {
        params: { data: notificationText },
      });
      setNotificationText('');
      console.log('Notification published successfully');
    } catch (err) {
      console.error('Error publishing notification:', err);
      alert('Failed to publish notification.');
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
          <span className="badge bg-info px-3 py-2 text-white fw-bold">
            Server-Sent Events (SSE)
          </span>
        </div>
      </nav>

      {/* Main Container */}
      <div className="container">
        <div className="row g-4">
          {/* Sender Panel */}
          <div className="col-md-5">
            <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: '12px' }}>
              <h4 className="fw-bold mb-3 text-secondary">Publish Notification</h4>
              <p className="text-muted small">
                Publish a server-sent event. This sends a request to the backend which broadcasts it to all connected SSE clients.
              </p>
              
              <form onSubmit={handlePublishNotification} className="mt-4">
                <div className="mb-3">
                  <label htmlFor="notifText" className="form-label fw-bold text-secondary">Notification Payload</label>
                  <textarea
                    id="notifText"
                    className="form-control bg-light border-0"
                    rows="4"
                    placeholder="Enter notification text here..."
                    value={notificationText}
                    onChange={(e) => setNotificationText(e.target.value)}
                    required
                  ></textarea>
                </div>
                <button type="submit" className="btn btn-info text-white btn-lg w-100 fw-bold shadow-sm">
                  Publish Event
                </button>
              </form>
            </div>
          </div>

          {/* Receiver Panel */}
          <div className="col-md-7">
            <div className="card border-0 shadow-sm p-4 h-100" style={{ borderRadius: '12px', minHeight: '450px' }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-bold mb-0 text-secondary">Live Event Stream</h4>
                <span className={`badge ${connected ? 'bg-success' : 'bg-danger'} py-2 px-3`}>
                  {connected ? '● Connected' : '○ Disconnected'}
                </span>
              </div>
              <p className="text-muted small mb-4">
                Listening to the SSE event channel `group1` from the server. Events are received in real-time.
              </p>

              {/* Event Log Window */}
              <div
                className="bg-light p-3 rounded"
                ref={logBoxRef}
                style={{ height: '280px', overflowY: 'auto', border: '1px solid #e3e6f0' }}
              >
                {receivedEvents.length === 0 ? (
                  <div className="text-center text-muted py-5">
                    Waiting for events... (Publish a notification to see it appear here)
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {receivedEvents.map((evt, index) => (
                      <div key={index} className="list-group-item bg-transparent px-0 py-2">
                        <span className="badge bg-secondary me-2">{evt.time}</span>
                        <strong className="text-dark">{evt.data}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
