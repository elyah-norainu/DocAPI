require('dotenv').config();
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET manquant. Copiez .env.example vers .env et configurez-le.');
  process.exit(1);
}
const app = require('./app');
const port = Number(process.env.PORT || 8000);
app.listen(port, () => {
  console.log(`API Bibliothèque démarrée : http://localhost:${port}`);
  console.log(`Swagger UI : http://localhost:${port}/api/docs`);
});
