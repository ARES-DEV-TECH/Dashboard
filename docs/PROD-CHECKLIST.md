# Checklist production

À vérifier avant / après déploiement (ex. Vercel).

## Base de données

### Pooler (Supabase / Vercel)

- [ ] **DATABASE_POOLER_URL** configuré en prod avec l’URL du pooler Supabase (port **6543**, pas 5432).
- [ ] Paramètres recommandés dans l’URL : `?pgbouncer=true&connect_timeout=30&connection_limit=1`
- [ ] Sur Vercel, le code utilise déjà `DATABASE_POOLER_URL` si présent (voir `src/lib/db.ts`). Il suffit d’ajouter la variable dans les paramètres du projet.

### Migrations et index

- [ ] Toutes les migrations Prisma sont appliquées en prod : `npx prisma migrate deploy` (ou via le pipeline de déploiement).
- [ ] Migration des index de perf : `20260131100000_add_perf_indexes` (et les autres selon l’historique).
- [ ] En local avec la même base : vérifier que les index existent et que les requêtes lourdes (dashboard, listes) sont rapides.

## Variables d’environnement

- [ ] **JWT_SECRET** : secret fort pour les sessions.
- [ ] **DATABASE_URL** et / ou **DATABASE_POOLER_URL** (voir ci-dessus).
- [ ] **Resend** (optionnel) : clé API pour envoi d’emails (mot de passe oublié).
- [ ] **Sentry** (optionnel) : `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, etc.

## Rate limiting

- [x] **Login** : 10 tentatives / minute par IP (in-memory par instance).
- [x] **Mot de passe oublié** : 5 demandes / minute par IP.
- [x] **Réinitialisation mot de passe** : 5 soumissions / minute par IP.
- [ ] Pour une limite **globale** (multi-instances) : prévoir Redis ou Vercel KV (optionnel).

## Procédure de rollback

En cas de problème après un déploiement :

1. **Vercel** : Dashboard → Projet → Deployments → clic sur le déploiement précédent (vert) → « Promote to Production ».
2. **Ou** : revenir au commit précédent et redéployer :
   - `git revert HEAD --no-edit && git push origin main` (crée un revert), ou
   - `git reset --hard <commit-précédent>` puis `git push --force` (à utiliser avec précaution si travail d'équipe).
3. Vérifier que la prod répond correctement après le rollback.
4. Corriger le bug en local, tester, puis redéployer.

## Après déploiement

- [ ] Tester une connexion et une navigation (dashboard, listes).
- [ ] Vérifier les toasts et Sentry en cas d’erreur.
