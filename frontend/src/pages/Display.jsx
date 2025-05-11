import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

export default function Display() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.emit('display_join');

    const handleDisplayMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('display_message', handleDisplayMessage);

    return () => {
      socket.off('display_message', handleDisplayMessage);
    };
  }, []);

  return (
    <div>
      <h2>Display Screen</h2>
      {messages.map((msg, i) => (
        <div key={i}>{msg}</div>
      ))}
    </div>
  );
}
