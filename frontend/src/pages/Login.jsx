import React, { useState } from 'react';
import axios from 'axios';
import "./Login.css";

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
  <div className="app-container">
    <header>app header tu</header>
    <div className="login-container">
      <div className="login-box">
        <h2>Đe Party - login</h2>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button onClick={login}>Prijava</button>
      </div>
    </div>
  </div>
);
}