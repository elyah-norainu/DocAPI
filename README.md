# API Bibliothèque — Node.js / Express

Projet individuel de gestion de bibliothèque : auteurs, livres, emprunts, authentification JWT, documentation OpenAPI et collection Postman.

## Prérequis
- Node.js 20 ou supérieur
- npm
- Postman (pour exécuter la collection)

## Installation (Ubuntu / Windows / macOS)

```bash
npm install
cp .env.example .env
```

Sous Windows PowerShell, utilisez `Copy-Item .env.example .env`.

Ouvrez `.env` et remplacez `JWT_SECRET` par une longue chaîne secrète. Les autres valeurs peuvent rester celles de démonstration pour un test local.

Initialisez les données :

```bash
npm run seed
```

Démarrez le serveur :

```bash
npm start
```

Mode développement :

```bash
npm run dev
```

- API : `http://localhost:8000/api/v1`
- Swagger UI : `http://localhost:8000/api/docs`
- Vérification : `http://localhost:8000/health`

## Compte de démonstration
- Username : `admin`
- Password : `admin123`

Le mot de passe est stocké sous forme de hash bcrypt dans SQLite. Changez-le avant toute utilisation réelle.

## Base de données
SQLite est créée automatiquement dans `database/library.sqlite`. Le schéma est défini dans `database/schema.sql`. Le seeder ajoute 3 auteurs, 5 livres, 2 emprunts (dont un en cours) et le compte administrateur. Pour réinitialiser les données, arrêtez le serveur, supprimez `database/library.sqlite`, puis relancez `npm run seed`.

## Authentification
1. Envoyez `POST /api/v1/auth/login` avec `{"username":"admin","password":"admin123"}`.
2. Copiez le champ `data.token`.
3. Ajoutez `Authorization: Bearer VOTRE_TOKEN` aux routes protégées. La collection Postman sauvegarde automatiquement le token dans la variable `token`.

## Routes
| Méthode | Endpoint | Protection |
|---|---|---|
| POST | `/auth/login` | Non |
| GET / POST | `/authors` | POST protégé |
| GET / PUT / DELETE | `/authors/{id}` | PUT et DELETE protégés |
| GET / POST | `/books` | POST protégé |
| GET / PUT / DELETE | `/books/{id}` | PUT et DELETE protégés |
| GET / POST | `/borrows` | Protégés |
| PATCH | `/borrows/{id}/return` | Protégé |

## Format des réponses
Les réponses usuelles suivent `{ success, data, message }`. Les erreurs de validation ajoutent `errors`. Une suppression réussie répond `204 No Content` sans corps, conformément à HTTP.

## Exemples rapides

```bash
curl http://localhost:8000/api/v1/books
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Fichiers de rendu
- `openapi.yaml` : contrat OpenAPI 3.0.3 et documentation Swagger UI.
- `postman/collection_bibliotheque_Elyah_Norainu.json` : collection v2.1.
- `postman/env_dev_Elyah_Norainu.json` et `postman/env_prod_Elyah_Norainu.json` : environnements Postman.
- `rapport/rapport_documentation.pdf` : rapport de synthèse.

## Limites et pistes d'amélioration
Ce projet est une base pédagogique locale. Pour une mise en production, ajouter notamment des rôles et permissions, une politique de rotation/renouvellement JWT, une pagination, des journaux d'audit, des tests unitaires et une configuration HTTPS.
