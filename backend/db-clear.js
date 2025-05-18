const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const db = new sqlite3.Database('./mydb.sqlite');

db.serialize(() => {
    db.run(`
        DROP TABLE question  
    `)

    db.run(`
        DROP TABLE user    
    `)
});