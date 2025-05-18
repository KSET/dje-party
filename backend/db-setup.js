const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const db = new sqlite3.Database('./mydb.sqlite');

db.serialize(() => {
  db.run(`
    CREATE TABLE question(
        id INTEGER PRIMARY KEY,
        round INTEGER,
        category TEXT,
        price INTEGER,
        question TEXT,
        answer TEXT,
        double INTEGER,
        answered INTEGER
    ) STRICT
  `);

  const question_insert = db.prepare(`
    INSERT INTO question
    (id, round, category, price, question, answer, double, answered) VALUES
    (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const filePath = path.join(__dirname, "questions.csv");
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Unable to read file:", err);
      return;
    }

    const rows = data.split("\n").slice(1);
    rows
      .filter((row) => row.trim() !== "")
      .forEach((row) => {
        const [id, round, category, price, question, answer, double, answered] = row.split(";;");
        const doubleInt = double?.toLowerCase() === 'true' ? 1 : 0;
        question_insert.run(
          parseInt(id),
          parseInt(round),
          category,
          parseInt(price),
          question,
          answer,
          doubleInt,
          0
        );
      });

    question_insert.finalize();
  });

  db.run(`
    CREATE TABLE user(
        username TEXT,
        password TEXT,
        role TEXT,
        display TEXT,
        points INTEGER
    ) STRICT 
  `);

  const user_insert = db.prepare(`
    INSERT INTO user
    (username, password, role, display, points) VALUES
    (?, ?, ?, ?, ?)    
  `);

  user_insert.run('admin', 'adminpass', 'admin', 'Administrator', 0);
  user_insert.run('display', 'display', 'display', 'Display', 0);
  user_insert.finalize();
});