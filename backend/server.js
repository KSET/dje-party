const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const fs = require("fs");
const csv = require("csv-parser");
const session = require('express-session');
const path = require('path');
const { EventEmitter } = require('stream');
const e = require('express');

const app = express();
const server = http.createServer(app);

const emitter = new EventEmitter()
emitter.setMaxListeners(0)


const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
});

// Load users from CSV
function loadUsersFromCSV(filePath) {
  const loadedUsers = {};
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      loadedUsers[row.username] = { password: row.password, role: row.role };
    })
    .on('end', () => {
      console.log('Users loaded from CSV');
    });
  return loadedUsers;
}

// Initialize users from CSV
let users = loadUsersFromCSV('./users.csv');

app.use(cors({
  origin: 'http://localhost:5173', // Adjust this to match your frontend's URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Adjust allowed methods as needed
  credentials: true // Allow credentials (cookies, authorization headers, etc.)
}));

app.use(bodyParser.json());

let approvedMessages = [];
let globalAllowed = false;


const PORT = 3001;

app.get("/api/questions", (req, res) => {
  const filePath = path.join(__dirname, "questions.csv");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Unable to read file" });
    }
    const rows = data.split("\n").slice(1); // Remove headers
    const questions = rows
      .filter((row) => row.trim() !== "") // Filter out empty rows
      .map((row) => {
        const [round, category, price, question, answer, double] =
          row.split(",");
        return { round, category, price, question, answer, double };
      });
    res.json(questions);
  });
});

app.use(session({
  secret: 'djeparty',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (user && user.password === password) {
    req.session.user = { username, role: user.role };
    res.json({ success: true, role: user.role });
  } else {
    res.status(401).json({ success: false });
  }
});

app.get('/session', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
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

  socket.on('user_message', ({ username, msg }) => {
    if (globalAllowed) {
      io.to('admin').emit('new_message', { username, msg });
    }
  });

  socket.on('display_join', () => {
    socket.join('display');
    approvedMessages.forEach((m) => socket.emit('display_message', m));
  });

  socket.on('admin_show_question', (question) => {
    console.log('Broadcasting question to display:', question);
    io.to('display').emit('display_question', question);
  });
});

server.listen(3001, () => {
  console.log('Server running on http://localhost:3001');
});
