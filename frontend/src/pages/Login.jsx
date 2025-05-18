import React, { useState } from 'react';
import axios from 'axios';
import "./Display.css";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const URL = import.meta.env.VITE_SERVER_URL

  const login = async () => {
    if (username === 'display')
      return onLogin('display', 'display');
    try {
      const res = await axios.post(`${URL}/login`, 
        { username, password }, 
        { withCredentials: true }
      );
      if (res.data.success) {
        onLogin(res.data.role, username);
      }
    } catch (err) {
      alert(err);
    }
  };

  return (
    <div className='login-container'>
      <h2>Login</h2>
      <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={login}>Prijava</button>
    </div>
  );
}