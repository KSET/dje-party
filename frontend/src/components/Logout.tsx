import React from 'react';
import axios from 'axios';

export default function LogoutButton({ onLogout }) {
  const logout = async () => {
    try {
      await axios.post('http://localhost:3001/logout', {}, { withCredentials: true });
      onLogout();
    } catch (err) {
      alert('Logout failed');
    }
  };

  return <button onClick={logout}>Logout</button>;
}