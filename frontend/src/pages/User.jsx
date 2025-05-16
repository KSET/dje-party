import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const URL = "http://10.30.1.59:3001"

const socket = io(`${URL}`);

export default function User({ username }) {
  const [message, setMessage] = useState('');
  const [canSend, setCanSend] = useState(true);

  // Register user /'s answering permissions
  useEffect(() => {
    socket.emit('login_user', username);
    const handlePermission = (allowed) => {
      setCanSend(allowed);
    };
    socket.on('permission_status', handlePermission);
    return () => {
      socket.off('permission_status', handlePermission);
    };
  }, [username]);

  // Send message to admin
  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit('user_message', { username, msg: message });
    setMessage('');
  };

  return (
    <div>
      <h2>Welcome, {username}</h2>
      <p style={{ color: canSend ? 'green' : 'red' }}>
        {canSend ? "You can send messages" : "You are blocked from sending messages"}
      </p>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter message"
        disabled={!canSend}
      />
      <button onClick={sendMessage} disabled={!canSend}>Send</button>
    </div>
  );
}
