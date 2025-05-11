import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    if (username === 'display')
      return onLogin('display', 'display');
    try {
      console.log("ide post u login")
      const res = await axios.post('http://localhost:3001/login', 
        { username, password }, 
        { withCredentials: true } // Include credentials in the request
      );
      if (res.data.success) {
        onLogin(res.data.role, username);
      }
    } catch (err) {
      alert(err);
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      <button onClick={login}>Login</button>
    </div>
  );
}