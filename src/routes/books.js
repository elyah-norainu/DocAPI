const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/responses');
const { validateBook } = require('../utils/validation');
const router = express.Router();

function getBook(id) {
  return db.prepare(`
    SELECT b.id, b.title, b.isbn, b.year, b.available, b.author_id,
           a.id AS a_id, a.first_name AS a_first_name, a.last_name AS a_last_name,
           a.nationality AS a_nationality
    FROM books b JOIN authors a ON a.id = b.author_id WHERE b.id = ?
  `).get(id);
}
function shape(row) {
  if (!row) return null;
  return {
    id: row.id, title: row.title, isbn: row.isbn, year: row.year,
    available: Boolean(row.available), author_id: row.author_id,
    author: { id: row.a_id, first_name: row.a_first_name, last_name: row.a_last_name, nationality: row.a_nationality }
  };
}

router.get('/', (req, res) => {
  let rows;
  if (req.query.available === 'true') rows = db.prepare('SELECT id FROM books WHERE available=1 ORDER BY id').all();
  else if (req.query.available === 'false') rows = db.prepare('SELECT id FROM books WHERE available=0 ORDER BY id').all();
  else rows = db.prepare('SELECT id FROM books ORDER BY id').all();
  ok(res, rows.map(r => shape(getBook(r.id))), req.query.available === 'true' ? 'Liste des livres disponibles.' : 'Liste des livres.');
});

router.post('/', auth, (req, res) => {
  const errors = validateBook(req.body, db);
  if (Object.keys(errors).length) return fail(res, 422, 'Validation échouée.', errors);
  const result = db.prepare(
    'INSERT INTO books (title,isbn,year,available,author_id) VALUES (?,?,?,?,?)'
  ).run(req.body.title.trim(), req.body.isbn.trim(), Number(req.body.year),
    req.body.available === undefined ? 1 : Number(req.body.available), Number(req.body.author_id));
  ok(res, shape(getBook(Number(result.lastInsertRowid))), 'Livre créé.', 201);
});

router.get('/:id', (req, res) => {
  const book = shape(getBook(Number(req.params.id)));
  if (!book) return fail(res, 404, 'Livre introuvable.');
  ok(res, book, 'Détails du livre et de son auteur.');
});

router.put('/:id', auth, (req, res) => {
  const id = Number(req.params.id);
  if (!getBook(id)) return fail(res, 404, 'Livre introuvable.');
  const errors = validateBook(req.body, db, id);
  if (Object.keys(errors).length) return fail(res, 422, 'Validation échouée.', errors);
  db.prepare('UPDATE books SET title=?,isbn=?,year=?,available=?,author_id=? WHERE id=?')
    .run(req.body.title.trim(), req.body.isbn.trim(), Number(req.body.year),
      req.body.available === undefined ? 1 : Number(req.body.available), Number(req.body.author_id), id);
  ok(res, shape(getBook(id)), 'Livre modifié.');
});

router.delete('/:id', auth, (req, res) => {
  const id = Number(req.params.id);
  if (!getBook(id)) return fail(res, 404, 'Livre introuvable.');
  const active = db.prepare('SELECT COUNT(*) AS count FROM borrows WHERE book_id=? AND returned_at IS NULL').get(id).count;
  if (active) return fail(res, 409, 'Impossible de supprimer un livre actuellement emprunté.');
  db.prepare('DELETE FROM borrows WHERE book_id=?').run(id);
  db.prepare('DELETE FROM books WHERE id=?').run(id);
  return res.status(204).end();
});

module.exports = router;
