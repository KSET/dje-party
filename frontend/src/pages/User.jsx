import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import "./User.css";

const socket = io();

export default function User({ username }) {
  const [message, setMessage] = useState('');
  const [bet, setBet] = useState(0);
  const [canSend, setCanSend] = useState(true);
  const [userPoints, setUserPoints] = useState(0);

  const [active, setActive] = useState(1);
  const [timer, setTimer] = useState(30);
  const [activeCountdown, setActiveCountdown] = useState(false);
  const intervalRef = useRef(null);

  // Register user and handle permissions
  useEffect(() => {
    socket.emit('login_user', username);

    const handlePermission = (allowed) => {
      console.log(`permission_status: allowed=${allowed}, active=${active}`);
      fetchPoints();
      setCanSend(allowed);
      setActiveCountdown(allowed);
      if (allowed) {
        startCountdown(active === 5 ? 60 : 30);
      }
    };

    socket.on('permission_status', handlePermission);

    socket.on('display_switch', (id) => {
      console.log(`display_switch: id=${id}, current active=${active}, timer=${timer}`);
      setActive(id);
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Only start countdown if allowed to send
      if (canSend && activeCountdown) {
        startCountdown(id === 5 ? 60 : 30);
      }
    });

    return () => {
      socket.off('permission_status', handlePermission);
      socket.off('display_switch');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [username, canSend, activeCountdown, active]);

  useEffect(() => {
    fetchPoints();
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit('user_message', { username, msg: message, bet: bet ? bet : 0 });
    setCanSend(false);
    setMessage('');
    alert("Hvala na odgovoru!");
  };

  const startCountdown = (initialTimer) => {
    console.log(`startCountdown: initialTimer=${initialTimer}, active=${active}`);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setTimer(initialTimer);

    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          console.log('Countdown finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const fetchPoints = async () => {
    const response = await fetch(`/api/points`);
    const data = await response.json();
    const _user = data.find((user) => user.username === username);
    const _points = _user ? _user.points : null;
    setUserPoints(_points);
  };

  return (
    <div className='user-container-full'>
      <header>
        <img src='../../logo.png' alt="Logo" />
      </header>
      <div className='user-container'>
        <div className='user-greet'>
          <p>Pozdrav, {username}!</p>
          <p>Stanje bodova: {userPoints}</p>
        </div>
        <p className='voting-message'>
          {canSend ? (
            <p>
              Odgovaranje je <span style={{ color: 'lightgreen' }}>otvoreno</span>
              {activeCountdown && ` ${timer} sekundi!`}
            </p>
          ) : (
            <p>
              Odgovaranje je trenutno <span style={{ color: 'red' }}>zatvoreno</span>!
            </p>
          )}
        </p>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={canSend ? "Odgovor..." : ""}
          disabled={!canSend}
        />
        {active === 5 && (
          <input
            type='number'
            min='0'
            max={userPoints}
            value={bet}
            onChange={(e) => setBet(e.target.value)}
            placeholder={canSend ? "Ulog..." : ""}
            disabled={!canSend}
          />
        )}
        <button onClick={sendMessage} disabled={!canSend}>Odgovori!</button>
      </div>
    </div>
  );
}