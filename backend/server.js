const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const fs = require("fs");
const csv = require("csv-parser");
const session = require('express-session');
const path = require('path');
const e = require('express');
require('dotenv').config({ path: '../frontend/.env' });

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./mydb.sqlite');

const app = express();
const server = http.createServer(app);
app.use(bodyParser.json());

const { EventEmitter } = require('stream');
const emitter = new EventEmitter()
emitter.setMaxListeners(0)

let approvedMessages = [];
let globalAllowed = false;
let playerPoints = {};

const URL = process.env.VITE_SERVER_URL.slice(0, -5)
const PORT = 3001;

const io = new Server(server, {
  cors: { origin: `${URL}:5173`, methods: ['GET', 'POST'] }
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
let users = loadUsersFromCSV('./users.csv');

app.use(cors({
  origin: `${URL}:5173`,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

function resetAnsweredFields() {
  const questions = [];
  let headers = [];
  let path = "./questions.csv";

  fs.createReadStream(path)
    .pipe(csv())
    .on("headers", (headerList) => {
      headers = headerList;
    })
    .on("data", (row) => {
      row.answered = "false";
      questions.push(row);
    })
    .on("end", () => {
      const output = [
        headers.join(","),
        ...questions.map(q => headers.map(h => q[h]).join(","))
      ].join("\n");
      fs.writeFileSync(path, output);
      console.log("All 'answered' fields reset to false.");
    });
}
resetAnsweredFields()

app.get("/", (req, res) => {
  return res.status(200).send("OK!");
})

app.get('/api/questions/:round', (req, res) => {
  round = parseInt(req.params.round)
  db.all(`select * from question where round = ${round}`, [], (err, rows) => {
    if (err) { console.log(err) }
    res.json(rows)
  })
});

app.post('/api/answer/:id', (req, res) => {
  id = req.params.id
  db.all(`update question set answered = 1 where id = ${id}`, [], (err, _) => {
    if (err) { console.log(err) }
    else { res.status(200).send("Question marked as read.") }
  })
});

app.post('/api/user', (req, res) => {
  console.log(req.body)
  let username = req.body.username;
  let password = req.body.password;
  let display = req.body.display;
  
  db.all(`insert into user (username, password, display, role, points)
    values (?, ?, ?, "user", 0)`,
    [username, password, display], (err, _) => {
    if (err) { console.log(err) }
    else { res.status(200).send("Adding a user successful") }
  })
})

app.get('/api/points', (req, res) => {
  db.all(`select username, display, points from user`, [], (err, rows) => {
    if (err) { console.log(err) }
    console.log(rows)
    res.json(rows)
  })
})

app.post('/api/points', (req, res) => {
  let username = req.body.username;
  let points = req.body.points;

  db.all(`update user set points = points + ? where username = ?`, [points, username], (err, _) => {
    if (err) { console.log(err) }
    else {return res.status(200).send("Points updated")}
  })
})

app.get("/api/questions", (req, res) => {
  const filePath = path.join(__dirname, "questions.csv");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Unable to read file" });
    }
    const rows = data.split("\n").slice(1);
    const questions = rows
      .filter((row) => row.trim() !== "")
      .map((row) => {
        const [ id, round, category, price, question, answer, double, answered ] =
          row.split(";;");
        return { id, round, category, price, question, answer, double, answered };
      });
    res.json(questions);
  });
});

app.use(session({
  secret: 'djeparty',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
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
  socket.on('login_user', (username) => {
    socket.username = username;
    if (!playerPoints[username]) {
      playerPoints[username] = 0;
    }
    socket.emit('permission_status', globalAllowed);
  });

  socket.on('user_message', ({ username, msg }) => {
    if (globalAllowed) {
      io.to('admin').emit('new_message', { username, msg });
    }
  });

  socket.on('update_points', ({ username, points }) => {
    if (playerPoints[username] !== undefined) {
      playerPoints[username] += points;
      io.to('admin').emit('points_updated', { username, points: playerPoints[username] });
    }
    console.log(playerPoints)
  });

  socket.on('admin_join', () => {
    socket.join('admin');
    socket.emit('approved_messages', approvedMessages);
    socket.emit('global_allowed', globalAllowed);
    socket.emit('player_points', playerPoints);
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

  socket.on('admin_show_question', (question) => {
    io.to('display').emit('display_question', question);
  });

  socket.on('show_answer', (data) => {
    io.to('display').emit('show_answer', data);
  });

  socket.on('close_question', () => {
    io.to('display').emit('close_question');
  });

  socket.on('mark_as_read', (questionId) => {
    io.to('display').emit('mark_as_read', questionId);
  });

  socket.on("update_csv", ({ id }) => {
    const fs = require("fs");
    const csv = require("csv-parser");
    const path = "./questions.csv";

    const questions = [];
    let headers = [];

    fs.createReadStream(path)
      .pipe(csv())
      .on("headers", (headerList) => {
        headers = headerList;
      })
      .on("data", (row) => {
        if (row.id === id.toString()) {
          row.answered = true;
        }
        questions.push(row);
      })
      .on("end", () => {
        const output = [
          headers.join(","),
          ...questions.map(q => headers.map(h => q[h]).join(","))
        ].join("\n");
        fs.writeFileSync(path, output);
      });
});

});

server.listen(PORT, () => {
  console.log(`Server running on ${URL}:${PORT}`)
});
