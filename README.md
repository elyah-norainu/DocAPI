# API Bibliothèque — Node.js / Express

Projet individuel de gestion de bibliothèque développé avec Node.js, Express et SQLite. L'API permet de gérer les auteurs, les livres et les emprunts, avec authentification JWT, recherche intelligente par IA, résumés automatiques de livres et gestion d'abonnements Free/Premium.

## Prérequis

- Node.js 20 ou supérieur
- npm
- Postman (pour exécuter la collection)

## Installation (Ubuntu / Windows / macOS)

```bash
npm install
cp .env.example .env
```

Sous Windows PowerShell :

```powershell
Copy-Item .env.example .env
```

Ouvrez le fichier `.env` et configurez les variables nécessaires :

- `JWT_SECRET` : une longue chaîne secrète pour signer les tokens JWT.
- `OPENAI_API_KEY` : la clé API utilisée pour accéder au service IA via OpenRouter.
- `OPENAI_BASE_URL` : l'adresse de l'API compatible OpenAI.
- `OPENAI_MODEL` : le modèle IA utilisé.
- `SIMULATED_WEBHOOK_SECRET` : une clé secrète utilisée pour sécuriser le webhook de paiement simulé.

Ne partagez jamais votre fichier `.env` et ne publiez pas vos clés secrètes.

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

- API : http://localhost:8000/api/v1
- Swagger UI : http://localhost:8000/api/docs
- Vérification : http://localhost:8000/health

## Compte de démonstration

- Username : `admin`
- Password : `admin123` (si le mot de passe du compte n'a pas été modifié).

Le mot de passe est stocké sous forme de hash bcrypt dans SQLite. Changez-le avant toute utilisation réelle.

## Base de données

SQLite est créée automatiquement dans `database/library.sqlite`. Le schéma initial est défini dans `database/schema.sql`.

Les principales tables sont :

- `authors` : informations sur les auteurs.
- `books` : informations sur les livres, leur disponibilité et leur résumé.
- `users` : comptes utilisateurs et statut d'abonnement.
- `borrows` : emprunts, dates et statut de paiement.
- `payments` : historique des paiements.

Le seeder ajoute les données de démonstration : auteurs, livres, emprunts et compte administrateur.

Pour réinitialiser la base de données, arrêtez le serveur, supprimez `database/library.sqlite`, puis relancez :

```bash
npm run seed
```

Les migrations ajoutent les colonnes et tables nécessaires aux nouvelles fonctionnalités.

## Authentification

L'API utilise JSON Web Token (JWT).

1. Envoyez une requête `POST /api/v1/auth/login` avec les identifiants du compte.
2. Récupérez le champ `data.token` dans la réponse.
3. Ajoutez le token dans l'en-tête des routes protégées :

```http
Authorization: Bearer VOTRE_TOKEN
```

La collection Postman sauvegarde automatiquement le token dans la variable `token` après une connexion réussie.

## Fonctionnalités et routes

### Authentification

| Méthode | Endpoint | Protection |
|---|---|---|
| POST | `/auth/login` | Publique |

### Auteurs

| Méthode | Endpoint | Protection |
|---|---|---|
| GET | `/authors` | Publique |
| POST | `/authors` | JWT |
| GET | `/authors/{id}` | Publique |
| PUT | `/authors/{id}` | JWT |
| DELETE | `/authors/{id}` | JWT |

### Livres

| Méthode | Endpoint | Protection |
|---|---|---|
| GET | `/books` | Publique |
| POST | `/books` | JWT |
| GET | `/books/{id}` | Publique |
| PUT | `/books/{id}` | JWT |
| DELETE | `/books/{id}` | JWT |

### Emprunts

| Méthode | Endpoint | Protection |
|---|---|---|
| GET | `/borrows` | JWT |
| POST | `/borrows` | JWT |
| PATCH | `/borrows/{id}/return` | JWT |

Chaque utilisateur consulte et gère uniquement ses propres emprunts.

- **Free** : maximum de 2 emprunts actifs.
- **Premium** : emprunts actifs sans limite définie par cette règle.

### Intelligence artificielle

| Méthode | Endpoint | Protection |
|---|---|---|
| POST | `/books/{id}/summary` | JWT |
| GET | `/books/{id}/summary` | Publique |
| POST | `/books/smart-search` | Publique |

Fonctionnalités :

- Génération automatique d'un résumé de livre avec un modèle IA.
- Enregistrement du résumé dans la base SQLite.
- Consultation du résumé enregistré.
- Recherche intelligente de livres à partir de mots-clés.

La génération de résumés utilise OpenRouter avec un modèle compatible avec l'API OpenAI.

### Abonnements et paiements

| Méthode | Endpoint | Protection |
|---|---|---|
| POST | `/subscriptions/payment-intent` | JWT |
| GET | `/subscriptions/status` | JWT |
| POST | `/webhooks/stripe` | Secret de simulation |

Fonctionnement :

1. L'utilisateur demande la création d'une intention de paiement.
2. Une entrée de paiement avec le statut `pending` est enregistrée dans SQLite.
3. Le webhook reçoit la confirmation simulée et vérifie le secret `x-simulation-secret`.
4. Si le paiement est validé, son statut passe à `paid` et l'abonnement de l'utilisateur devient `premium`.
5. L'utilisateur peut consulter son statut et son historique de paiements.

Le tarif utilisé pour la démonstration est de **500 EUR par mois**.

**Important :** le paiement est entièrement simulé localement. Il ne s'agit pas d'une intégration réelle de Stripe et aucun paiement bancaire réel n'est effectué. La route `/webhooks/stripe` est conservée pour reproduire le fonctionnement d'un webhook dans le cadre pédagogique.

## Format des réponses

Les réponses usuelles suivent la structure :

```json
{
  "success": true,
  "data": {},
  "message": "Opération réussie"
}
```

Les erreurs de validation peuvent également contenir un champ `errors`.

Une suppression réussie répond `204 No Content`, sans corps, conformément à HTTP.

## Exemples rapides

Consulter les livres :

```bash
curl http://localhost:8000/api/v1/books
```

Se connecter :

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

Les routes protégées nécessitent un token JWT dans l'en-tête `Authorization`.

## Tests avec Postman

La collection Postman se trouve dans :

`postman/collection_bibliotheque_Elyah_Norainu.json`

Les environnements de développement et de production sont :

- `postman/env_dev_Elyah_Norainu.json`
- `postman/env_prod_Elyah_Norainu.json`

Pour tester l'API :

1. Importez la collection et l'environnement de développement dans Postman.
2. Configurez les variables nécessaires, notamment `base_url` et `simulation_secret`.
3. Exécutez la requête de connexion pour récupérer automatiquement le JWT.
4. Testez les routes des auteurs, des livres et des emprunts.
5. Testez les fonctionnalités IA.
6. Dans le dossier `Subscriptions & Payments`, exécutez successivement la création du paiement, sa confirmation simulée et la consultation du statut d'abonnement.

La variable `simulation_secret` doit contenir la même valeur que `SIMULATED_WEBHOOK_SECRET` dans le fichier `.env`. Ne partagez pas cette valeur.

## Fichiers de rendu

- `openapi.yaml` : contrat OpenAPI 3.0.3 et documentation Swagger UI.
- `postman/collection_bibliotheque_Elyah_Norainu.json` : collection Postman v2.1.
- `postman/env_dev_Elyah_Norainu.json` et `postman/env_prod_Elyah_Norainu.json` : environnements Postman.
- `rapport/rapport_documentation.pdf` : rapport de synthèse.

## Limites et pistes d'amélioration

Ce projet constitue une base pédagogique locale.

Pour une utilisation en production, plusieurs améliorations seraient nécessaires :

- Intégrer un véritable prestataire de paiement et ses webhooks officiels.
- Mettre en place des rôles et permissions plus détaillés.
- Ajouter une politique de renouvellement et de rotation des JWT.
- Ajouter la pagination aux listes.
- Mettre en place des journaux d'audit.
- Ajouter des tests unitaires et des tests d'intégration.
- Configurer HTTPS et renforcer la sécurité des données.
