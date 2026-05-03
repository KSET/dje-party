// dbControl.js
const sqlite3 = require('sqlite3').verbose();
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

    // Table created successfully, no CSV loading
    db.close();
    return { message: 'Question table successfully created.' };

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