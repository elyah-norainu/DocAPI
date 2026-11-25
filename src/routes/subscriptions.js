
const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { ok, fail } = require('../utils/responses');

const router = express.Router();

const SUBSCRIPTION_PRICE = 500;
const CURRENCY = 'eur';

// Créer une intention de paiement simulée
router.post('/payment-intent', auth, (req, res) => {
  const user = db.prepare(`
    SELECT id, subscription_status
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return fail(res, 404, 'Utilisateur introuvable.');
  }

  if (user.subscription_status === 'premium') {
    return fail(res, 409, 'Ton compte possède déjà un abonnement Premium.');
  }

  const payment = db.prepare(`
    INSERT INTO payments (user_id, amount, currency, status, created_at)
    VALUES (?, ?, ?, 'pending', ?)
  `).run(
    user.id,
    SUBSCRIPTION_PRICE,
    CURRENCY,
    new Date().toISOString()
  );

  const createdPayment = db.prepare(`
    SELECT id, user_id, amount, currency, status, created_at
    FROM payments
    WHERE id = ?
  `).get(payment.lastInsertRowid);

  ok(
    res,
    {
      payment: createdPayment,
      simulation: true,
      message: 'Paiement simulé créé. Utilise la route de confirmation pour le valider.'
    },
    'Intention de paiement créée.',
    201
  );
});

// Consulter le statut de son abonnement
router.get('/status', auth, (req, res) => {
  const user = db.prepare(`
    SELECT id, username, subscription_status
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return fail(res, 404, 'Utilisateur introuvable.');
  }

  const payments = db.prepare(`
    SELECT id, amount, currency, status, created_at, paid_at
    FROM payments
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(user.id);

  ok(
    res,
    {
      user_id: user.id,
      username: user.username,
      subscription_status: user.subscription_status,
      payments
    },
    'Statut de l’abonnement récupéré.'
  );
});

module.exports = router;
