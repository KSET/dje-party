// dbControl.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises; // Use promises version of fs
const path = require('path');
const db = new sqlite3.Database('./mydb.sqlite');

const dropQuestionTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`DROP TABLE IF EXISTS question`, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve({ message: 'Question table successfully dropped.' });
      }
    });
  });
};

const createQuestionTable = async () => {
  try {
    // Create the table
    await new Promise((resolve, reject) => {
      db.run(
        `
        CREATE TABLE IF NOT EXISTS question (
          id INTEGER PRIMARY KEY,
          round INTEGER,
          category TEXT,
          price INTEGER,
          question TEXT,
          answer TEXT,
          double INTEGER,
          answered INTEGER
        ) STRICT
      `,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Read and insert data from CSV
    const filePath = path.join(__dirname, 'questions.csv');
    const data = await fs.readFile(filePath, 'utf8');
    const rows = data.split('\n').slice(1).filter(row => row.trim() !== '');

    const question_insert = db.prepare(`
      INSERT INTO question (id, round, category, price, question, answer, double, answered)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await new Promise((resolve, reject) => {
      db.serialize(() => {
        rows.forEach(row => {
          const [id, round, category, price, question, answer, double] = row.split(';;');
          question_insert.run(
            parseInt(id),
            parseInt(round),
            category,
            parseInt(price),
            question,
            answer,
            parseInt(double),
            0,
            (err) => {
              if (err) reject(err);
            }
          );
        });
        question_insert.finalize((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    return { message: 'Question table successfully created and populated.' };
  } catch (err) {
    throw err; // Throw to be caught by Express route
  }
};

const dropUserTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`DROP TABLE IF EXISTS user`, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve({ message: 'User table successfully dropped.' });
      }
    });
  });
};

const createUserTable = async () => {
  try {
    // Create the table
    await new Promise((resolve, reject) => {
      db.run(
        `
        CREATE TABLE IF NOT EXISTS user (
          username TEXT,
          password TEXT,
          role TEXT,
          display TEXT,
          points INTEGER
        ) STRICT
      `,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Insert default users
    const user_insert = db.prepare(`
      INSERT INTO user (username, password, role, display, points)
      VALUES (?, ?, ?, ?, ?)
    `);

    await new Promise((resolve, reject) => {
      db.serialize(() => {
        user_insert.run('admin', 'adminpass', 'admin', 'Administrator', 0, (err) => {
          if (err) reject(err);
        });
        user_insert.run('display', 'display', 'display', 'Display', 0, (err) => {
          if (err) reject(err);
        });
        user_insert.finalize((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    return { message: 'User table successfully created and populated.' };
  } catch (err) {
    throw err; // Throw to be caught by Express route
  }
};

module.exports = {
  dropQuestionTable,
  createQuestionTable,
  dropUserTable,
  createUserTable,
};