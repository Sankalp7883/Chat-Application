import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [logoutMessage, setLogoutMessage] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('logout') !== null) {
      setLogoutMessage(true);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLogoutMessage(false);

    try {
      if (isRegister) {
        // Register flow
        const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
          username,
          password
        });
        setSuccess('Registration successful! Please sign in.');
        setIsRegister(false);
        setPassword('');
      } else {
        // Login flow
        const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
          username,
          password
        });

        if (response.data && response.data.status === 'success') {
          localStorage.setItem('accessToken', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          localStorage.setItem('username', response.data.username);
          navigate('/');
        } else {
          setError('Invalid username or password.');
        }
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else if (err.response && err.response.status === 401) {
        setError('Invalid username or password.');
      } else {
        setError('Connection error. Make sure the backend server is running.');
      }
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
      <div className="card shadow-sm border-0 p-4" style={{ width: '100%', maxWidth: '400px', borderRadius: '12px' }}>
        <div className="text-center mb-4">
          <h2 className="fw-bold text-primary">Chat Application</h2>
          <p className="text-muted">{isRegister ? 'Create an account to start' : 'Sign in to start chatting'}</p>
        </div>

        {error && (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success py-2" role="alert">
            {success}
          </div>
        )}

        {logoutMessage && (
          <div className="alert alert-success py-2" role="alert">
            You have been successfully logged out.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="username" className="form-label text-secondary fw-semibold">Username</label>
            <input
              type="text"
              className="form-control form-control-lg bg-light border-0"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
            {!isRegister && (
              <div className="form-text text-muted">Use one of: Nio, Jason, Lana, Max, Joe, Mike</div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="form-label text-secondary fw-semibold">Password</label>
            <input
              type="password"
              className="form-control form-control-lg bg-light border-0"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-100 shadow-sm mb-3" style={{ borderRadius: '8px' }}>
            {isRegister ? 'Register' : 'Sign In'}
          </button>
        </form>

        <div className="text-center mt-2">
          <button
            type="button"
            className="btn btn-link p-0 text-decoration-none"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
              setSuccess(null);
            }}
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
