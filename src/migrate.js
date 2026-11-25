const db = require('./db');

const hasColumn = (table, column) => {
  return db.pragma(`table_info(${table})`).some(col => col.name === column);
};

const migrate = db.transaction(() => {
  if (!hasColumn('books', 'summary')) {
    db.exec('ALTER TABLE books ADD COLUMN summary TEXT');
  }

  if (!hasColumn('borrows', 'payment_status')) {
    db.exec(`
      ALTER TABLE borrows
      ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'free'
      CHECK (payment_status IN ('pending', 'paid', 'free'))
    `);
  }

  if (!hasColumn('users', 'subscription_status')) {
    db.exec(`
      ALTER TABLE users
      ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'free'
      CHECK (subscription_status IN ('free', 'premium'))
    `);
  }
});

migrate();

console.log('Migration terminée avec succès !');
db.close();
