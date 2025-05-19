import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL
const socket = io(`${URL}`);

export default function User({ username }) {
  const [message, setMessage] = useState('');
  const [canSend, setCanSend] = useState(true);
  const [userPoints, setUserPoints] = useState(0);

  const [timer, setTimer] = useState(30);
  const [activeCountdown, setActiveCountdown] = useState(false);
  const intervalRef = useRef(null)

  // Register user /'s answering permissions
  useEffect(() => {
    socket.emit('login_user', username);
    const handlePermission = (allowed) => {
      setCanSend(allowed);
      setActiveCountdown(allowed);
      if (allowed) startCountdown();
    };
    socket.on('permission_status', handlePermission);
    return () => {
      socket.off('permission_status', handlePermission);
    };
  }, [username]);

  useEffect(() => {
    const fetchPoints = async () => {
      const response = await fetch(`${URL}/api/points`)
      const data = await response.json()
      const _user = data.find(user => user.username === username);
      const _points = _user ? _user.points : null;
      setUserPoints(_points);
    }

    fetchPoints();
  }, []);

  // Send message to admin
  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit('user_message', { username, msg: message });
    setCanSend(false);
    setMessage('');
    alert("Odgovoreno!")
  };

  const startCountdown = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setTimer(30);
    
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className='user-container-full'>
      <div className='user-container'>
        <p style={{ color: canSend ? 'green' : 'red' }}>
          {canSend ? "You can send messages" : "You are blocked from sending messages"}
        </p>
        {activeCountdown && (<p>{timer}</p>)}
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter message"
          disabled={!canSend}
        />
        <button onClick={sendMessage} disabled={!canSend}>Send</button>
      </div>
    </div>
  );
}
