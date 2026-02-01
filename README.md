# ARES Dashboard

Application web de pilotage d’entreprise : clients, articles, ventes, charges, dashboard avec KPIs et graphiques. Données isolées par utilisateur (multi-utilisateurs).

## Fonctionnalités

- **Dashboard** : KPIs (CA HT, charges, résultat net, marge), graphiques d’évolution et par service, filtres par période, comparaison avec période précédente.
- **Clients** : CRUD, recherche, export/import CSV.
- **Articles** : Services et produits (prix HT, TVA, options), export/import CSV.
- **Ventes** : Facturation, numéros auto, liaison client/service, export CSV.
- **Charges** : Charges professionnelles, récurrentes ou ponctuelles, liaison service/client, répartition par catégorie.
- **Paramètres** : Taux URSSAF, TVA, logo entreprise.
- **Auth** : Inscription avec **confirmation par email** (lien « Valider mon compte »), connexion (JWT), mot de passe oublié, réinitialisation, renvoi d’email de confirmation.

## Stack

- **Frontend** : Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts, SWR.
- **Backend** : API Routes Next.js, Prisma, PostgreSQL (Supabase).
- **Auth** : JWT (cookie httpOnly), confirmation email à l’inscription, rate limiting (login, forgot-password, resend-confirmation).
- **Accessibilité** : focus visible au clavier, lien d’évitement « Aller au contenu ».
- **Desktop** : Electron 38 (optionnel, voir README-ELECTRON.md).

## Installation

### Prérequis

- Node.js 18+
- PostgreSQL (ou compte Supabase)

### Étapes

```bash
git clone <repository-url>
cd ares-dashboard

npm install

# Fichier d'environnement (copier et renseigner)
cp .env.example .env

# Générer le client Prisma (automatique après npm install via postinstall)
npx prisma generate

# Créer les tables et optionnellement les données de démo
npx prisma db push
npm run db:seed
```

### Variables d’environnement

- `DATABASE_URL` : URL PostgreSQL (ex. Supabase).
- En production (Vercel) : `DATABASE_POOLER_URL` avec l’URL du pooler (port 6543) et `?pgbouncer=true&connect_timeout=30&connection_limit=1`.
- `JWT_SECRET` : Secret pour signer les tokens (obligatoire en prod).
- Optionnel (emails) : `RESEND_API_KEY`, `RESEND_FROM_EMAIL` pour le mot de passe oublié.

### Mot de passe oublié

Sans Resend, le lien de réinitialisation est affiché dans l’interface (dev) ou indiqué comme “email non configuré” (prod). Avec Resend configuré, l’email est envoyé automatiquement.

### Tests E2E

Les tests Playwright (`e2e/auth.spec.ts`, `e2e/api-auth.spec.ts`) vérifient les pages auth (login, register, forgot-password) et les réponses API.

- **Première fois** : installer les navigateurs avec `npx playwright install`.
- Lancer : `npm run test:e2e`. Le serveur dev est démarré automatiquement.
- **CI (GitHub Actions)** : à chaque push sur `main`/`master`, build + job E2E (Playwright). Pour que les E2E passent en CI, ajouter le secret `DATABASE_URL` (et optionnellement `JWT_SECRET`) dans les paramètres du dépôt. Sans secret, le job E2E peut échouer mais le workflow reste vert (job non bloquant).

### Performance en dev

- `npm run dev` utilise **Turbopack** pour des compilations et un HMR plus rapides. Le premier chargement d’une page ou d’une API reste plus lent (compilation à la demande).
- Après connexion, les routes principales et les API sont préchargées (prefetch + warmup) pour limiter la latence au premier clic.
- En cas de souci avec Turbopack : `npm run dev:webpack`. Pour repartir d’un cache propre : `./scripts/dev-fresh.sh`.
- Si des erreurs `ENOENT: _buildManifest.js.tmp` apparaissent en dev, supprimer le cache : `rm -rf .next` puis relancer `npm run dev` (ou `./scripts/dev-fresh.sh`).

## Commandes

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement (Turbopack, compilations plus rapides) |
| `npm run dev:webpack` | Dev avec Webpack si besoin de compatibilité |
| `npm run build` | Build de production |
| `npm run start` | Démarrer en production |
| `npm run db:push` | Synchroniser le schéma Prisma avec la BDD |
| `npm run db:seed` | Peupler les paramètres par défaut |
| `npm run db:studio` | Ouvrir Prisma Studio |
| `npm run db:reset` | Réinitialiser la BDD (schéma + seed) |
| `npm run test:e2e` | Lancer les tests E2E (Playwright ; le serveur dev est démarré automatiquement) |
| `npm run test:e2e:ui` | Lancer Playwright en mode UI |
| `npm run electron:dev` | Lancer l’app en mode Electron (voir README-ELECTRON.md) |

## Structure du projet

```
ares-dashboard/
├── src/
│   ├── app/              # App Router Next.js
│   │   ├── api/          # API Routes (auth, dashboard, clients, articles, sales, charges, etc.)
│   │   ├── dashboard/    # Page dashboard + contenu + hooks SWR
│   │   ├── clients/      # Gestion clients
│   │   ├── articles/     # Gestion articles
│   │   ├── sales/        # Gestion ventes
│   │   ├── charges/      # Gestion charges
│   │   ├── settings/     # Paramètres entreprise
│   │   ├── login/, register/, forgot-password/, reset-password/
│   │   └── layout.tsx, globals.css
│   ├── components/       # Layout, navigation, auth-provider, ui (shadcn)
│   └── lib/              # auth, db, validations, math, date-utils, electron-api, etc.
├── prisma/
│   ├── schema.prisma     # Schéma BDD (User, Client, Article, Sale, Charge, etc.)
│   ├── migrations/       # Migrations SQL
│   └── seed-realistic.ts # Seed paramètres
├── public/               # Assets, images, uploads (logos)
├── electron/             # Main et preload Electron (si usage desktop)
├── docs/                 # Documentation (migrations, etc.)
├── ROADMAP.md            # Priorités et roadmap
└── README-ELECTRON.md    # Build et usage Electron
```

## Données par utilisateur

Les clients, articles, ventes, charges et paramètres sont isolés par utilisateur (clés composites ou `userId`). Pour migrer une base existante, voir `docs/MIGRATION-PER-USER-DATA.md` et les scripts SQL dans `prisma/migrations/`.

## Déploiement (Vercel)

- Configurer `DATABASE_POOLER_URL` (Supabase pooler, port 6543) et `JWT_SECRET`.
- Le build exécute `prisma generate` (postinstall).
- Fichier `.vercelignore` utilisé pour exclure `node_modules`, `.next`, `dist-electron`, `public/uploads`, etc.

## Licence

MIT.
