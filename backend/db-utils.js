// dbControl.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises; 
const path = require('path');
const db = new sqlite3.Database('./mydb.sqlite'); //ovo pec pec

const dropQuestionTable = () => {
  const db =new sqlite3.Database('./mydb.sqlite'); 
  return new Promise((resolve, reject) => {
    db.run(`DROP TABLE IF EXISTS question`, (err) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve({ message: 'Question table successfully dropped.' });
      }
    });
  });
};

const createQuestionTable = async () => {
  const db = new sqlite3.Database('./mydb.sqlite'); 

  try {

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
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    // Read and insert data from CSV
    const filePath = path.join(__dirname, 'questions.csv');
    const data = await fs.readFile(filePath, 'utf8');
    const rows = data.split('\n').slice(1).filter(row => row.trim() !== '');


    await new Promise((resolve, reject) => {
      const insertStmt = db.prepare(`
        INSERT INTO question (id, round, category, price, question, answer, double, answered)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      db.serialize(() => {
        for (const row of rows) {
          const [id, round, category, price, question, answer, double] = row.split(';;');
          insertStmt.run(
            parseInt(id),
            parseInt(round),
            category,
            parseInt(price),
            question,
            answer,
            parseInt(double),
            0,
            (err) => {
              if (err) {
                console.error('Fail row:', row, err.message);
                reject(err);
              }
            }
          );
        }

        insertStmt.finalize((err) => {
          if (err) {
            console.error('Fail', err.message);
            reject(err);
          } else {
            console.log('Sve insertano kak spada.');
            resolve();
          }
        });
      });
    });

    db.close();
    return { message: 'Question table successfully created and populated.' };

  } catch (err) {
    db.close();
    throw err;
  }
};

const dropUserTable = () => {
  const db = new sqlite3.Database('./mydb.sqlite'); 
  return new Promise((resolve, reject) => {
    db.run(`DROP TABLE IF EXISTS user`, (err) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve({ message: 'User table successfully dropped.' });
      }
    });
  });
};

const createUserTable = async () => {
  const db = new sqlite3.Database('./mydb.sqlite'); 

  try {

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
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    const user_insert = db.prepare(`
      INSERT INTO user (username, password, role, display, points)
      VALUES (?, ?, ?, ?, ?)
    `);

    await new Promise((resolve, reject) => {
      db.serialize(() => {
        user_insert.run('admin', 'adminpass', 'admin', 'Administrator', 0, (err) => {
          if (err) {
            reject(err);
          }
        });

        user_insert.run('display', 'display', 'display', 'Display', 0, (err) => {
          if (err) {
            reject(err);
          }
        });

        user_insert.finalize((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    });

    db.close();
    return { message: 'User table successfully created and populated.' };

  } catch (err) {
    db.close();
    throw err;
  }
};

module.exports = {
  dropQuestionTable,
  createQuestionTable,
  dropUserTable,
  createUserTable,
};