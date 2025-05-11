const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(bodyParser.json());

let users = {
  admin: { password: 'adminpass', role: 'admin' },
};
let approvedMessages = [];
let globalAllowed = true;

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (user && user.password === password) {
    res.json({ success: true, role: user.role });
  } else {
    res.status(401).json({ success: false });
  }
});

app.post('/add-user', (req, res) => {
  const { adminUser, adminPass, newUser, newPass } = req.body;
  if (users[adminUser]?.password === adminPass && users[adminUser].role === 'admin') {
    users[newUser] = { password: newPass, role: 'user' };
    res.json({ success: true });
  } else {
    res.status(403).json({ success: false });
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('login_user', (username) => {
    socket.username = username;
    socket.emit('permission_status', globalAllowed);
  });

  socket.on('user_message', ({ username, msg }) => {
    console.log(`Received message from ${username}: ${msg}`);
    if (globalAllowed) {
      io.to('admin').emit('new_message', { username, msg });
    }
  });

  socket.on('admin_join', () => {
    socket.join('admin');
    socket.emit('approved_messages', approvedMessages);
    socket.emit('global_allowed', globalAllowed);
  });

  socket.on('approve_message', (msg) => {
    approvedMessages.push(msg);
    io.to('display').emit('display_message', msg);
    io.to('admin').emit('approved_messages', approvedMessages);
  });

  socket.on('set_global_permission', (allowed) => {
    globalAllowed = allowed;
    io.emit('permission_status', globalAllowed);
    io.to('admin').emit('global_allowed', globalAllowed);
  });

  socket.on('display_join', () => {
    socket.join('display');
    approvedMessages.forEach((m) => socket.emit('display_message', m));
  });
});

server.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
