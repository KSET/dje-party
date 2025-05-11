
import React, { useState } from 'react';
import Login from './pages/Login.jsx';
import User from './pages/User.jsx';
import Admin from './pages/Admin.jsx';
import Display from './pages/Display.jsx';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');

  if (!loggedIn) {
    return <Login onLogin={(r, u) => { setRole(r); setUsername(u); setLoggedIn(true); }} />;
  }

  if (role === 'admin') return <Admin />;
  if (role === 'display') return <Display />;
  return <User username={username} />;
}
