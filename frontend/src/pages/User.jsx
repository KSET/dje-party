import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import "./User.css";

const socket = io();

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
      fetchPoints();
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
    fetchPoints();
  }, []);

  // Send message to admin
  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit('user_message', { username, msg: message });
    setCanSend(false);
    setMessage('');
    alert("Hvala na odgovoru!")
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

  const fetchPoints = async () => {
    const response = await fetch(`/api/points`)
    const data = await response.json()
    const _user = data.find(user => user.username === username);
    const _points = _user ? _user.points : null;
    setUserPoints(_points);
  }

  return (
    <div className='user-container-full'>
      <header>
        <img src='../../logo.png'></img>
      </header>
      <div className='user-container'>
        <div className='user-greet'>
          <p>Pozdrav, {username}!</p>
          <p>Stanje bodova: {userPoints}</p>
        </div>
        <p className='voting-message'>
          {canSend ?
            <p>
              Odgovaranje je{' '}
              <span style={{ color: 'lightgreen' }}>otvoreno</span>
              {activeCountdown && ` ${timer} sekundi!`}
            </p>
            :
            <p>
              Odgovaranje je trenutno{' '}
              <span style={{ color: 'red'}}>zatvoreno</span>!
            </p>
          }
        </p>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={canSend ? "Odgovor..." : ""}
          disabled={!canSend}
        />
        <button onClick={sendMessage} disabled={!canSend}>Odgovori!</button>
      </div>
    </div>
  );
}
