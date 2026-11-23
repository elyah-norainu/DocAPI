const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const configuredPath = process.env.DATABASE_FILE || './database/library.sqlite';
const dbPath = path.resolve(configuredPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
const schema = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
db.exec(schema);

module.exports = db;
