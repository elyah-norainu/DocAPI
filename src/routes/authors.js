const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/responses');
const { validateAuthor } = require('../utils/validation');
const router = express.Router();

router.get('/', (req, res) => {
  const authors = db.prepare('SELECT * FROM authors ORDER BY id').all();
  ok(res, authors, 'Liste des auteurs.');
});

router.post('/', auth, (req, res) => {
  const errors = validateAuthor(req.body);
  if (Object.keys(errors).length) return fail(res, 422, 'Validation échouée.', errors);
  const result = db.prepare(
    'INSERT INTO authors (first_name, last_name, nationality) VALUES (?, ?, ?)'
  ).run(req.body.first_name.trim(), req.body.last_name.trim(), req.body.nationality.trim());
  const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(result.lastInsertRowid);
  ok(res, author, 'Auteur créé.', 201);
});

router.get('/:id', (req, res) => {
  const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(Number(req.params.id));
  if (!author) return fail(res, 404, 'Auteur introuvable.');
  const books = db.prepare('SELECT * FROM books WHERE author_id = ? ORDER BY id').all(author.id);
  ok(res, { ...author, books }, 'Détails de l’auteur et ses livres.');
});

router.put('/:id', auth, (req, res) => {
  const author = db.prepare('SELECT * FROM authors WHERE id = ?').get(Number(req.params.id));
  if (!author) return fail(res, 404, 'Auteur introuvable.');
  const errors = validateAuthor(req.body);
  if (Object.keys(errors).length) return fail(res, 422, 'Validation échouée.', errors);
  db.prepare('UPDATE authors SET first_name=?, last_name=?, nationality=? WHERE id=?')
    .run(req.body.first_name.trim(), req.body.last_name.trim(), req.body.nationality.trim(), author.id);
  ok(res, db.prepare('SELECT * FROM authors WHERE id=?').get(author.id), 'Auteur modifié.');
});

router.delete('/:id', auth, (req, res) => {
  const author = db.prepare('SELECT * FROM authors WHERE id=?').get(Number(req.params.id));
  if (!author) return fail(res, 404, 'Auteur introuvable.');
  const linked = db.prepare('SELECT COUNT(*) AS count FROM books WHERE author_id=?').get(author.id).count;
  if (linked) return fail(res, 409, 'Impossible de supprimer un auteur qui possède encore des livres.');
  db.prepare('DELETE FROM authors WHERE id=?').run(author.id);
  return res.status(204).end();
});

module.exports = router;
