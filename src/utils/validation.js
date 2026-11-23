const ISBN_RE = /^(?:ISBN(?:-10|-13)?:?\s*)?(?=[0-9X-]{10,17}$)[0-9X-]+$/i;

function validateAuthor(body) {
  const errors = {};
  for (const field of ['first_name', 'last_name', 'nationality']) {
    if (typeof body[field] !== 'string' || !body[field].trim()) {
      errors[field] = [`Le champ ${field} est requis et doit être une chaîne non vide.`];
    }
  }
  return errors;
}

function validateBook(body, db, currentId = null) {
  const errors = {};
  if (typeof body.title !== 'string' || !body.title.trim()) errors.title = ['Le titre est requis.'];
  if (typeof body.isbn !== 'string' || !body.isbn.trim()) errors.isbn = ["L'ISBN est requis."];
  else if (!ISBN_RE.test(body.isbn.trim())) errors.isbn = ["Le format de l'ISBN est invalide."];
  else {
    const existing = db.prepare('SELECT id FROM books WHERE isbn = ?').get(body.isbn.trim());
    if (existing && existing.id !== currentId) errors.isbn = ["Cet ISBN existe déjà."];
  }
  const year = Number(body.year);
  if (!Number.isInteger(year) || year < 1450 || year > new Date().getFullYear()) {
    errors.year = ["L'année doit être un entier valide compris entre 1450 et l'année actuelle."];
  }
  if (!Number.isInteger(Number(body.author_id)) || Number(body.author_id) < 1) {
    errors.author_id = ["author_id doit être un entier positif."];
  } else if (!db.prepare('SELECT id FROM authors WHERE id = ?').get(Number(body.author_id))) {
    errors.author_id = ["L'auteur indiqué n'existe pas."];
  }
  if (body.available !== undefined && typeof body.available !== 'boolean') {
    errors.available = ['available doit être un booléen.'];
  }
  return errors;
}

function validateBorrow(body, db) {
  const errors = {};
  if (typeof body.user_name !== 'string' || !body.user_name.trim()) {
    errors.user_name = ["Le nom de l'emprunteur est requis."];
  }
  if (!Number.isInteger(Number(body.book_id)) || Number(body.book_id) < 1) {
    errors.book_id = ['book_id doit être un entier positif.'];
  } else {
    const book = db.prepare('SELECT id, available FROM books WHERE id = ?').get(Number(body.book_id));
    if (!book) errors.book_id = ["Le livre indiqué n'existe pas."];
    else if (!book.available) errors.book_id = ['Ce livre est déjà emprunté.'];
  }
  return errors;
}

module.exports = { validateAuthor, validateBook, validateBorrow };
