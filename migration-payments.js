
const db = require('better-sqlite3')('./database/library.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL DEFAULT 500,
    currency TEXT NOT NULL DEFAULT 'eur',
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'paid', 'failed')),
    created_at TEXT NOT NULL,
    paid_at TEXT DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_payments_user_id
  ON payments(user_id);
`);

console.log('Table payments créée ou déjà existante.');

console.table(
  db.prepare('PRAGMA table_info(payments)').all()
);

db.close();
