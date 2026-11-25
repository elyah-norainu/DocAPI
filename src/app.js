const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const db = require('./db');
const { ok, fail } = require('./utils/responses');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const openapi = YAML.load(path.join(__dirname, '..', 'openapi.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, {
  customSiteTitle: 'API Bibliothèque — Documentation'
}));

app.get('/health', (req, res) => ok(res, { status: 'UP' }, 'API opérationnelle.'));

app.post('/api/v1/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return fail(res, 422, 'Validation échouée.', {
      username: ['Le nom utilisateur est requis.'],
      password: ['Le mot de passe est requis.']
    });
  }
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return fail(res, 401, 'Identifiants incorrects.');
  }
  const token = jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
  ok(res, { token, token_type: 'Bearer', expires_in: process.env.JWT_EXPIRES_IN || '2h',
    user: { id: user.id, username: user.username } }, 'Authentification réussie.');
});

app.use('/api/v1/authors', require('./routes/authors'));
app.use('/api/v1/books', require('./routes/aiBooks'));
app.use('/api/v1/books', require('./routes/books'));
app.use('/api/v1/borrows', require('./routes/borrows'));
app.use('/api/v1/subscriptions', require('./routes/subscriptions'));
app.use('/api/v1/webhooks', require('./routes/webhooks'));

app.use((req, res) => fail(res, 404, 'Route introuvable.'));
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof SyntaxError && 'body' in err) return fail(res, 400, 'JSON mal formé.');
  return fail(res, 500, 'Erreur interne du serveur.');
});

module.exports = app;
