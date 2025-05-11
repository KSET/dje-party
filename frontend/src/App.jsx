import React, { useState, useEffect } from 'react';
import Login from './pages/Login.jsx';
import User from './pages/User.jsx';
import Admin from './pages/Admin.jsx';
import Display from './pages/Display.jsx';
import axios from 'axios';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    axios.get('http://localhost:3001/session', { withCredentials: true })
      .then(res => {
        const { username, role } = res.data;
        setRole(role);
        setUsername(username);
        setLoggedIn(true);
      })
      .catch(() => {
        setLoggedIn(false);
      });
  }, []);

  if (!loggedIn) {
    return <Login onLogin={(r, u) => { setRole(r); setUsername(u); setLoggedIn(true); }} />;
  }

  if (role === 'admin') return <Admin />;
  if (role === 'display') return <Display />;
  return <User username={username} />;
}