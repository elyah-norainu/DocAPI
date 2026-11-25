
const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/responses');
const { validateBorrow } = require('../utils/validation');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const rows = db.prepare(`
    SELECT br.*, b.title AS book_title, b.isbn
    FROM borrows br
    JOIN books b ON b.id = br.book_id
    WHERE br.returned_at IS NULL
      AND br.user_id = ?
    ORDER BY br.id DESC
  `).all(req.user.id);

  ok(res, rows, 'Liste des emprunts en cours.');
});

router.post('/', auth, (req, res) => {
  const errors = validateBorrow(req.body, db);

  if (Object.keys(errors).length) {
    return fail(res, 422, 'Validation échouée.', errors);
  }

  const user = db.prepare(`
    SELECT id, username, subscription_status
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return fail(res, 401, 'Utilisateur introuvable.');
  }

  const activeBorrows = db.prepare(`
    SELECT COUNT(*) AS total
    FROM borrows
    WHERE user_id = ?
      AND returned_at IS NULL
  `).get(user.id).total;

  if (user.subscription_status !== 'premium' && activeBorrows >= 2) {
    return fail(
      res,
      403,
      'La limite de 2 emprunts actifs du compte Free est atteinte. Passez à Premium pour emprunter sans limite.'
    );
  }

  const create = db.transaction(() => {
    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO borrows (
        user_name,
        user_id,
        book_id,
        borrowed_at,
        returned_at,
        payment_status
      )
      VALUES (?, ?, ?, ?, NULL, ?)
    `).run(
      req.body.user_name.trim(),
      user.id,
      Number(req.body.book_id),
      now,
      user.subscription_status === 'premium' ? 'paid' : 'free'
    );

    db.prepare(`
      UPDATE books
      SET available = 0
      WHERE id = ?
    `).run(Number(req.body.book_id));

    return db.prepare(`
      SELECT *
      FROM borrows
      WHERE id = ?
    `).get(result.lastInsertRowid);
  });

  try {
    ok(res, create(), 'Emprunt enregistré.', 201);
  } catch (error) {
    console.error(error);
    return fail(res, 500, "Impossible d'enregistrer l'emprunt.");
  }
});

router.patch('/:id/return', auth, (req, res) => {
  const borrow = db.prepare(`
    SELECT *
    FROM borrows
    WHERE id = ? AND user_id = ?
  `).get(Number(req.params.id), req.user.id);

  if (!borrow) {
    return fail(res, 404, 'Emprunt introuvable.');
  }

  if (borrow.returned_at) {
    return fail(res, 409, 'Cet emprunt a déjà été clôturé.');
  }

  const returnedAt = new Date().toISOString();

  const update = db.transaction(() => {
    db.prepare(`
      UPDATE borrows
      SET returned_at = ?
      WHERE id = ?
    `).run(returnedAt, borrow.id);

    db.prepare(`
      UPDATE books
      SET available = 1
      WHERE id = ?
    `).run(borrow.book_id);

    return db.prepare(`
      SELECT *
      FROM borrows
      WHERE id = ?
    `).get(borrow.id);
  });

  ok(res, update(), 'Livre marqué comme rendu.');
});

module.exports = router;
