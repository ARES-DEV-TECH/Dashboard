# ARES Dashboard – Application Electron

Version desktop de l’application (Next.js + Electron). Les données restent sur le serveur PostgreSQL ; l’app se connecte via l’API.

## Prérequis

- Node.js 18+
- Base PostgreSQL configurée (ex. Supabase)

## Configuration

Dans `.env` :

- `DATABASE_URL` : URL PostgreSQL
- `JWT_SECRET` : Secret pour les tokens (même valeur qu’en web)

## Commandes

| Commande | Description |
|----------|-------------|
| `npm run electron:dev` | Lancer Next.js + Electron en dev (hot reload) |
| `npm run electron:build` | Build Next.js pour production |
| `npm run electron:dist` | Build + packaging Electron (tous les plateformes) |
| `npm run electron:dist-mac` | Packaging Mac uniquement (Intel + Apple Silicon) |

## Build et distribution

Après `npm run electron:dist-mac`, les artefacts sont dans `dist-electron/` (DMG, ZIP).

## Fichiers principaux

- `electron/main.js` – Processus principal Electron
- `electron/preload.js` – Preload
- `electron-builder.json` – Configuration du packaging

## Notes

- L’app nécessite une connexion au serveur (API Next.js + BDD).
- En dev, `electron:dev` démarre Next.js puis ouvre la fenêtre Electron.
