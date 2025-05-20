import React, { useState } from 'react';
import axios from 'axios';
import "./Login.css";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    if (username === 'display') {
      setUsername('')
      setPassword('')
      return onLogin('display', 'display'); 
    }
    try {
      const res = await axios.post(`/login`, 
        { username, password }, 
        { withCredentials: true }
      );
      if (res.data.success) {
        setUsername('')
        setPassword('')
        onLogin(res.data.role, username);
      }
    } catch (err) {
      alert(err);
    }
  };

 return (
  <div className="app-container" style={{ overflow: 'hidden'}}>
    <header>
      <img src='../../logo.png'></img>
    </header>
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