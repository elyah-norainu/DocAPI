const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { ok, fail } = require('../utils/responses');

const router = express.Router();

router.post('/stripe', (req, res) => {
  const expectedSecret = process.env.SIMULATED_WEBHOOK_SECRET;
  const receivedSecret = req.headers['x-simulation-secret'];

  if (!expectedSecret || typeof receivedSecret !== 'string') {
    return fail(res, 401, 'Secret de simulation manquant ou invalide.');
  }

  const expected = Buffer.from(expectedSecret);
  const received = Buffer.from(receivedSecret);

  if (
    expected.length !== received.length ||
    !crypto.timingSafeEqual(expected, received)
  ) {
    return fail(res, 401, 'Secret de simulation invalide.');
  }

  const { payment_id } = req.body || {};

  if (!Number.isInteger(Number(payment_id)) || Number(payment_id) < 1) {
    return fail(res, 422, 'payment_id doit être un entier positif.');
  }

  const payment = db.prepare(`
    SELECT id, user_id, status
    FROM payments
    WHERE id = ?
  `).get(Number(payment_id));

  if (!payment) {
    return fail(res, 404, 'Paiement introuvable.');
  }

  if (payment.status === 'paid') {
    return fail(res, 409, 'Ce paiement a déjà été confirmé.');
  }

  if (payment.status !== 'pending') {
    return fail(res, 409, 'Ce paiement ne peut pas être confirmé.');
  }

  const confirmPayment = db.transaction(() => {
    db.prepare(`
      UPDATE payments
      SET status = 'paid', paid_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), payment.id);

    db.prepare(`
      UPDATE users
      SET subscription_status = 'premium'
      WHERE id = ?
    `).run(payment.user_id);
  });

  confirmPayment();

  return ok(
    res,
    {
      payment_id: payment.id,
      user_id: payment.user_id,
      payment_status: 'paid',
      subscription_status: 'premium',
      simulation: true
    },
    'Paiement simulé confirmé. Abonnement Premium activé.'
  );
});

module.exports = router;