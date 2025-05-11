import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:3001');

export default function Admin() {
  const [messages, setMessages] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [globalAllowed, setGlobalAllowed] = useState(true);
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');

  useEffect(() => {
    socket.emit('admin_join');

    const handleNewMessage = (msg) => {
      setIncoming(m => [...m, msg]);
    };
    const handleApproved = (msgs) => {
      setMessages(msgs);
    };
    const handlePermission = (allowed) => {
      setGlobalAllowed(allowed);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('approved_messages', handleApproved);
    socket.on('global_allowed', handlePermission);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('approved_messages', handleApproved);
      socket.off('global_allowed', handlePermission);
    };
  }, []);

  const approve = (msg) => {
    socket.emit('approve_message', msg.username + ": " + msg.msg);
  };

  const blockAll = () => {
    socket.emit('set_global_permission', false);
  };

  const unblockAll = () => {
    socket.emit('set_global_permission', true);
  };

  const addUser = async () => {
    await axios.post('http://localhost:3001/add-user', {
      adminUser: 'admin',
      adminPass: 'adminpass',
      newUser,
      newPass
    });
    setNewUser('');
    setNewPass('');
  };

  return (
    <div>
      <h2>Admin Panel</h2>

      <h3>Add User</h3>
      <input placeholder="Username" value={newUser} onChange={e => setNewUser(e.target.value)} />
      <input placeholder="Password" value={newPass} onChange={e => setNewPass(e.target.value)} />
      <button onClick={addUser}>Add User</button>

      <h3>Incoming Messages</h3>
      {incoming.map((m, i) => (
        <div key={i}>
          <b>{m.username}</b>: {m.msg}
          <button onClick={() => approve(m)}>Show</button>
        </div>
      ))}

      <h3>Approved Messages (on display)</h3>
      {messages.map((m, i) => (
        <div key={i}>{m}</div>
      ))}

      <h3>Global Permissions</h3>
      <p>
        All users are currently: <b>{globalAllowed ? "Allowed" : "Blocked"}</b>
      </p>
      <button onClick={blockAll}>Block All</button>
      <button onClick={unblockAll}>Unblock All</button>
    </div>
  );
}
