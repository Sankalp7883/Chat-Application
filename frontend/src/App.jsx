import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import GroupChat from './pages/GroupChat';
import PrivateChat from './pages/PrivateChat';
import RawChat from './pages/RawChat';
import SseNotifications from './pages/SseNotifications';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/group-chat" element={<GroupChat />} />
        <Route path="/private-chat" element={<PrivateChat />} />
        <Route path="/raw-chat" element={<RawChat />} />
        <Route path="/sse-notifications" element={<SseNotifications />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
