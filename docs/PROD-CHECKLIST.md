# Checklist production

À vérifier avant / après déploiement (ex. Vercel).

## Avant déploiement

- [ ] **Build** : `npm run build` réussit en local.
- [ ] **Variables d’env** : JWT_SECRET, DATABASE_URL / DATABASE_POOLER_URL, emails (Resend ou SMTP), optionnel Sentry.
- [ ] **VERCEL_URL** : en prod Vercel définit automatiquement cette variable (utilisée pour les liens dans les emails : confirmation, reset password). Si déploiement ailleurs, définir l’URL publique de l’app.

## Base de données

### Pooler (Supabase / Vercel)

- [ ] **DATABASE_POOLER_URL** configuré en prod avec l’URL du pooler Supabase (port **6543**, pas 5432).
- [ ] Paramètres recommandés dans l’URL : `?pgbouncer=true&connect_timeout=30&connection_limit=1`
- [ ] Sur Vercel, le code utilise déjà `DATABASE_POOLER_URL` si présent (voir `src/lib/db.ts`). Si `connection_limit` est absent, il est ajouté automatiquement (recommandé en serverless).

### Migrations et index

- [ ] Colonne **emailVerifiedAt** sur `users` : si l’historique migrate ne s’applique pas (ex. BDD PostgreSQL alors que migrations créées en SQLite), exécuter à la main :
  ```sql
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
  UPDATE "users" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;
  ```
- [ ] Ou utiliser `npx prisma db push` pour synchroniser le schéma.
- [ ] Index de perf : `20260131100000_add_perf_indexes` (sales_userId_saleDate_idx, charges_userId_expenseDate_idx, etc.) appliqués en prod.
- [ ] En local avec la même base : vérifier que les index existent et que les requêtes lourdes (dashboard, listes) sont rapides.

## Variables d’environnement

- [ ] **JWT_SECRET** : secret fort pour les sessions (et tokens confirmation / reset password).
- [ ] **DATABASE_URL** et / ou **DATABASE_POOLER_URL** (voir ci-dessus).
- [ ] **Emails** : Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) ou SMTP (`SMTP_HOST`, `SMTP_PORT` 465, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`) pour :
  - mot de passe oublié,
  - confirmation d’inscription (lien « Valider mon compte »),
  - email de bienvenue (après validation du compte).
- [ ] **Sentry** (optionnel) : `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, etc.

## Rate limiting

- [x] **Login** : 10 tentatives / minute par IP (in-memory par instance).
- [x] **Mot de passe oublié** : 5 demandes / minute par IP.
- [x] **Réinitialisation mot de passe** : 5 soumissions / minute par IP.
- [x] **Renvoyer email de confirmation** : 3 demandes / minute par IP.
- [ ] Pour une limite **globale** (multi-instances) : prévoir Redis ou Vercel KV (optionnel).

## Notifier les utilisateurs d’un changement d’URL

Si vous changez de domaine ou de projet (ex. nouvelle URL Vercel) et souhaitez prévenir tous les utilisateurs :

1. **Script** : `npx tsx scripts/notify-users-new-url.ts "https://dashboard-three-beta-62.vercel.app/dashboard"`
2. Ou définir `NEW_APP_URL` dans `.env.local` puis lancer `npx tsx scripts/notify-users-new-url.ts`
3. Le script envoie un email à **chaque utilisateur avec email vérifié** (Resend ou SMTP déjà configuré). Prérequis : `DATABASE_URL`, `RESEND_API_KEY` (ou SMTP).

**Note** : L’URL de production Vercel (déploiement `main`) est stable. Utilisez un **domaine personnalisé** pour éviter de changer d’URL. Ce script sert surtout quand vous changez de domaine ou de projet.

## Procédure de rollback

En cas de problème après un déploiement :

1. **Vercel** : Dashboard → Projet → Deployments → clic sur le déploiement précédent (vert) → « Promote to Production ».
2. **Ou** : revenir au commit précédent et redéployer :
   - `git revert HEAD --no-edit && git push origin main` (crée un revert), ou
   - `git reset --hard <commit-précédent>` puis `git push --force` (à utiliser avec précaution si travail d'équipe).
3. Vérifier que la prod répond correctement après le rollback.
4. Corriger le bug en local, tester, puis redéployer.

## Après déploiement

- [ ] **Connexion** : se connecter avec un compte existant (email déjà vérifié).
- [ ] **Navigation** : dashboard, listes (clients, articles, ventes, charges), paramètres.
- [ ] **Inscription** : créer un compte → vérifier réception email « Validez votre compte » → cliquer sur le lien → vérifier page « Compte activé » et email de bienvenue → se connecter.
- [ ] **Mot de passe oublié** : demander un lien → vérifier réception et réinitialisation.
- [ ] **Toasts et Sentry** : vérifier en cas d’erreur (message utilisateur + rapport Sentry si configuré).
