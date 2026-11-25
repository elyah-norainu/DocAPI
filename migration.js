
const db = require('better-sqlite3')('./database/library.sqlite');

const columns = db.pragma('table_info(borrows)');
const exists = columns.some(col => col.name === 'user_id');

if (!exists) {
  db.exec('ALTER TABLE borrows ADD COLUMN user_id INTEGER REFERENCES users(id)');
  console.log('Colonne user_id ajoutée.');
} else {
  console.log('La colonne user_id existe déjà.');
}

const result = db.prepare(`
  UPDATE borrows
  SET user_id = (
    SELECT users.id
    FROM users
    WHERE users.username = borrows.user_name
  )
  WHERE user_id IS NULL
`).run();

console.log('Emprunts associés :', result.changes);
console.log('Migration terminée.');

db.close();
