# Prototype de marketplace multi-vendeurs

Backend Medusa (TypeScript) + PostgreSQL, et site Next.js (`storefront`).
Paiements, livraisons, commissions : simulés. Données : fictives.

## Structure

```
marketplace-prototype/
├─ README.md
├─ .gitignore
├─ docs/                  Registre des décisions et comptes rendus
├─ storefront/            Site Next.js (anglais américain, USD), port 8000
│  ├─ .env.local.example  Modèle de configuration (copier en .env.local)
│  └─ src/                Pages, composants, accès au backend
└─ backend/               Backend Medusa (port 9000)
   ├─ .env.template       Modèle de configuration (copier en .env)
   ├─ medusa-config.ts    Configuration pilotée par variables d'environnement
   ├─ package.json
   ├─ src/                Code du projet (modules, API, workflows…)
   └─ integration-tests/  Tests d'intégration
```

## Prérequis (Windows)

- Node.js 22 LTS (version testée : 22.22.2) — https://nodejs.org
- PostgreSQL 16 ou plus récent (version testée : 16) — https://www.postgresql.org/download/windows/
- Git

## Installation

Dans le terminal de VS Code (PowerShell), depuis le dossier du projet :

```powershell
# 1. Créer la base (adapter le chemin et la version de PostgreSQL)
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE marketplace;"

# 2. Configurer
cd backend
copy .env.template .env
# Ouvrir backend\.env et remplacer VOTRE_MOT_DE_PASSE dans DATABASE_URL

# 3. Installer et migrer
npm install
npx medusa db:migrate

# 4. Créer un administrateur (choisir email et mot de passe)
npx medusa user -e votre@email.test -p VotreMotDePasse

# 5. Lancer
npm run dev
```

Vérifications : http://localhost:9000/health (doit répondre 200) puis http://localhost:9000/app (administration).

## Catalogue de démonstration et site

Le catalogue est entièrement fictif (marques inventées, aucun avis ni note). À faire UNE fois, backend arrêté ou non :

```powershell
cd backend
npx medusa exec ./src/scripts/seed-marketplace.ts
```

Le script crée la boutique américaine (USD), 20 rayons, 7 vendeurs et 400 fiches catalogue (20 par rayon, réglable
avec la variable `SEED_PRODUCTS_PER_CATEGORY`), puis affiche une **clé publique** (`pk_...`). Il refuse de s'exécuter
si le catalogue contient déjà des fiches.

Ensuite, deux terminaux :

```powershell
# Terminal 1 : backend
cd backend
npm run dev

# Terminal 2 : site (première fois : créer .env.local et y coller la clé affichée par le script)
cd storefront
copy .env.local.example .env.local
npm install
npm run dev
```

Ouvrir http://localhost:8000. Vérifications : `npm run typecheck` puis `npm run build` dans `storefront`.

## Tests

```powershell
cd backend
$env:DB_HOST="localhost"; $env:DB_USERNAME="postgres"; $env:DB_PASSWORD="VOTRE_MOT_DE_PASSE"
npm run test:integration:http
```

## Production / hébergeur

- Compiler : `npm run build` ; la version à déployer est dans `backend/.medusa/server`
  (y lancer `npm install --omit=dev`, puis `npx medusa start`).
- Variables obligatoires en production : `DATABASE_URL`, `STORE_CORS`, `ADMIN_CORS`,
  `AUTH_CORS`, `JWT_SECRET`, `COOKIE_SECRET`. Le démarrage échoue si l'une manque.
- Optionnelles : `DATABASE_SSL=true`, `REDIS_URL`, `MEDUSA_WORKER_MODE`,
  `MEDUSA_BACKEND_URL`, `DISABLE_MEDUSA_ADMIN`, `PASSWORD_MIN_LENGTH` (4), `LOGIN_MAX_FAILURES` (5),
  `LOGIN_LOCK_MINUTES` (15), `PERSONAL_DATA_RETENTION_DAYS` (90).
- Fichiers téléversés : le dossier local `uploads/` est éphémère chez la plupart des hébergeurs.
  Prévoir un stockage compatible S3 avant d'accepter des images envoyées par des vendeurs.

## Git

```powershell
git init
git add .
git commit -m "Fondation : backend Medusa"
# Créer un dépôt PRIVÉ sur GitHub, puis :
git remote add origin https://github.com/VOTRE_COMPTE/VOTRE_DEPOT.git
git branch -M main
git push -u origin main
```
