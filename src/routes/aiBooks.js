
const express = require('express');
const db = require('../db');
const authenticate = require('../middleware/auth');
const { ok, fail } = require('../utils/responses');

const router = express.Router();

async function askGemini(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = (
    process.env.OPENAI_BASE_URL ||
    'https://openrouter.ai/api/v1'
  ).replace(/\/+$/, '');
  const model = process.env.OPENAI_MODEL || 'liquid/lfm-3-1.7b:free';

  if (!apiKey) {
    throw new Error('Clé API IA manquante.');
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    console.error('Erreur OpenRouter :', {
      status: response.status,
      error: result.error || result
    });

    throw new Error(
      result.error?.message || `Erreur HTTP ${response.status}`
    );
  }

  return result.choices?.[0]?.message?.content || '';
}

function getBook(id) {
  return db.prepare(`
    SELECT b.*, a.first_name, a.last_name
    FROM books b
    JOIN authors a ON a.id = b.author_id
    WHERE b.id = ?
  `).get(id);
}

// Recherche intelligente
router.post('/smart-search', async (req, res) => {
  const { query } = req.body || {};

  if (typeof query !== 'string' || !query.trim()) {
    return fail(res, 422, 'Une recherche est requise.');
  }

  try {
    const content = await askGemini(`
      Analyse cette recherche de livres.
      Extrais au maximum 10 mots-clés courts et pertinents.
      Inclus des mots-clés en français et en anglais si utile.
      Utilise des mots simples plutôt que des phrases.
      Évite les mots trop généraux.
      Réponds uniquement avec un tableau JSON de chaînes de caractères.

      Recherche : "${query.trim()}"
    `);

    const cleaned = content.replace(/```json|```/g, '').trim();
    const keywords = JSON.parse(cleaned);

    if (!Array.isArray(keywords)) {
      throw new Error('Réponse IA invalide.');
    }

    const terms = keywords
      .filter(word => typeof word === 'string')
      .map(word => word.trim())
      .filter(Boolean)
      .slice(0, 10);

    const stopWords = [
      'je', 'cherche', 'un', 'une', 'des', 'du', 'de',
      'la', 'le', 'les', 'et', 'ou', 'qui', 'que',
      'pour', 'dans', 'avec', 'à', 'au', 'aux',
      'the', 'a', 'an', 'and', 'or', 'of', 'to'
    ];

    const searchTerms = [
      ...new Set(
        terms.filter(word =>
          !stopWords.includes(word.toLowerCase()) &&
          word.length >= 3
        )
      )
    ];

    let books = [];

    if (searchTerms.length > 0) {
      const conditions = searchTerms.map(() =>
        `(b.title LIKE ? OR a.first_name LIKE ? OR a.last_name LIKE ? OR b.summary LIKE ?)`
      );

      const params = searchTerms.flatMap(word => {
        const value = `%${word}%`;
        return [value, value, value, value];
      });

      books = db.prepare(`
        SELECT DISTINCT
          b.id,
          b.title,
          b.isbn,
          b.year,
          b.available,
          b.summary,
          a.first_name,
          a.last_name
        FROM books b
        JOIN authors a ON a.id = b.author_id
        WHERE ${conditions.join(' OR ')}
        LIMIT 20
      `).all(...params);
    }

    return ok(res, {
      query,
      keywords: terms,
      data: books
    });

  } catch (error) {
    console.error('Smart search:', error.message);
    return fail(
      res,
      503,
      'Le service de recherche intelligente est indisponible.'
    );
  }
});

// Générer et enregistrer le résumé
router.post('/:id/summary', authenticate, async (req, res) => {
  const book = getBook(req.params.id);

  if (!book) {
    return fail(res, 404, 'Livre introuvable.');
  }

  if (book.summary) {
    return ok(res, {
      book_id: book.id,
      title: book.title,
      summary: book.summary,
      generated_by: 'database',
      generated_at: null
    }, 'Résumé déjà disponible.');
  }

  try {
    const summary = await askGemini(`
      Tu es un assistant bibliothécaire.
      Rédige en français une présentation concise de maximum 3 phrases
      à partir des informations suivantes.
      N'invente pas de détails qui ne sont pas fournis.

      Titre : ${book.title}
      Auteur : ${book.first_name} ${book.last_name}
      Année : ${book.year}
    `);

    if (!summary.trim()) {
      throw new Error('Résumé vide.');
    }

    db.prepare('UPDATE books SET summary = ? WHERE id = ?')
      .run(summary.trim(), book.id);

    return ok(res, {
      book_id: book.id,
      title: book.title,
      summary: summary.trim(),
      generated_by: process.env.OPENAI_MODEL || 'liquid/lfm-3-1.7b:free',
      generated_at: new Date().toISOString()
    }, 'Résumé généré avec succès.');

  } catch (error) {
    console.error('Book summary:', error.message);
    return fail(
      res,
      503,
      'Impossible de générer le résumé pour le moment.'
    );
  }
});

// Récupérer un résumé existant
router.get('/:id/summary', (req, res) => {
  const book = getBook(req.params.id);

  if (!book) {
    return fail(res, 404, 'Livre introuvable.');
  }

  if (!book.summary) {
    return fail(res, 404, 'Aucun résumé disponible.');
  }

  return ok(res, {
    book_id: book.id,
    title: book.title,
    summary: book.summary
  });
});

module.exports = router;
