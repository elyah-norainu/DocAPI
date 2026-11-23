const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/responses');
const { validateBorrow } = require('../utils/validation');
const router = express.Router();

router.get('/', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT br.*, b.title AS book_title, b.isbn
    FROM borrows br JOIN books b ON b.id = br.book_id
    WHERE br.returned_at IS NULL ORDER BY br.id DESC
  `).all();
  ok(res, rows, 'Liste des emprunts en cours.');
});

router.post('/', auth, (req, res) => {
  const errors = validateBorrow(req.body, db);
  if (Object.keys(errors).length) return fail(res, 422, 'Validation échouée.', errors);
  const create = db.transaction(() => {
    const now = new Date().toISOString();
    const result = db.prepare(
      'INSERT INTO borrows (user_name,book_id,borrowed_at,returned_at) VALUES (?,?,?,NULL)'
    ).run(req.body.user_name.trim(), Number(req.body.book_id), now);
    db.prepare('UPDATE books SET available=0 WHERE id=?').run(Number(req.body.book_id));
    return db.prepare('SELECT * FROM borrows WHERE id=?').get(result.lastInsertRowid);
  });
  ok(res, create(), 'Emprunt enregistré.', 201);
});

router.patch('/:id/return', auth, (req, res) => {
  const borrow = db.prepare('SELECT * FROM borrows WHERE id=?').get(Number(req.params.id));
  if (!borrow) return fail(res, 404, 'Emprunt introuvable.');
  if (borrow.returned_at) return fail(res, 409, 'Cet emprunt a déjà été clôturé.');
  const returnedAt = new Date().toISOString();
  const update = db.transaction(() => {
    db.prepare('UPDATE borrows SET returned_at=? WHERE id=?').run(returnedAt, borrow.id);
    db.prepare('UPDATE books SET available=1 WHERE id=?').run(borrow.book_id);
    return db.prepare('SELECT * FROM borrows WHERE id=?').get(borrow.id);
  });
  ok(res, update(), 'Livre marqué comme rendu.');
});

module.exports = router;
