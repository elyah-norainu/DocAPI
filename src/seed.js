require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const authorCount = db.prepare('SELECT COUNT(*) AS count FROM authors').get().count;
if (authorCount === 0) {
  const insertAuthor = db.prepare(
    'INSERT INTO authors (first_name, last_name, nationality) VALUES (?, ?, ?)'
  );
  const authors = [
    ['Robert', 'Martin', 'Américaine'],
    ['George', 'Orwell', 'Britannique'],
    ['Antoine', 'de Saint-Exupéry', 'Française']
  ];
  const ids = authors.map(a => Number(insertAuthor.run(...a).lastInsertRowid));

  const insertBook = db.prepare(
    'INSERT INTO books (title, isbn, year, available, author_id) VALUES (?, ?, ?, ?, ?)'
  );
  const books = [
    ['Clean Code', '978-0132350884', 2008, 1, ids[0]],
    ['The Clean Coder', '978-0137081073', 2011, 1, ids[0]],
    ['1984', '978-0451524935', 1949, 0, ids[1]],
    ['Animal Farm', '978-0451526342', 1945, 1, ids[1]],
    ['Le Petit Prince', '978-2070612758', 1943, 1, ids[2]]
  ];
  books.forEach(b => insertBook.run(...b));

  const insertBorrow = db.prepare(
    'INSERT INTO borrows (user_name, book_id, borrowed_at, returned_at) VALUES (?, ?, ?, ?)'
  );
  const now = new Date().toISOString();
  insertBorrow.run('Jean', 3, now, null);
  insertBorrow.run('Marie', 1, now, new Date().toISOString());
}

const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD || 'admin123';
const user = db.prepare('SELECT username FROM users WHERE username = ?').get(username);
if (!user) {
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, bcrypt.hashSync(password, 10));
}
console.log('Seed terminé. Compte de démonstration :', username);
db.close();
