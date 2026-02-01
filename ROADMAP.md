# Roadmap ARES Dashboard

Priorités et prochaines évolutions du projet.

---

## Vue d’ensemble

| Bloc | Statut | Prochaine action |
|------|--------|------------------|
| **Bugs / corrections** | ✅ Tous traités | — |
| **Stabilité** (toasts, Sentry) | ✅ Fait | Rate limiting (reporter) |
| **Performance perçue** (SWR, prefetch, virtualisation, PDF worker) | ✅ Fait | — |
| **Délais BDD / API / navigation** | ✅ Fait | Agrégation SQL, optimistic updates (toutes listes), skeleton, checklist prod (docs/PROD-CHECKLIST.md) |
| **UX** (breadcrumbs) | ✅ Fait | Fil d’Ariane générique |
| **Maintenabilité** (CI, types, composant liste) | ✅ Fait | CI build ✅, types centralisés ✅, DataTable documenté (docs/COMPOSANT-LISTE.md) |
| **Nice-to-have** | ⬜ Plus tard | Raccourcis clavier, tests, accessibilité |

---

## ✅ Déjà fait

### Corrections (bugs)

| Sujet | Action réalisée |
|-------|-----------------|
| API ventes PUT | Body nettoyé avant validation Zod (caHt, tvaAmount, totalTtc, year) |
| PDF facture – TOTAUX | Montants sécurisés dans drawInvoiceTotals / drawTotalsSection |
| PDF facture – mise en page | Largeurs colonnes tableau devis/facture ajustées |
| Comparaison temporelle | Résultat Net = resultAfterUrssaf, plafond ±300 %, « — » si non fini |
| Sale – conflit numéro facture | Clé composite (userId, invoiceNo) ; numéros F2026-000001 par user |

### Stabilité

- **Toasts** : Sonner, messages par zone (Ventes, Clients, Charges, etc.)
- **Sentry** : instrumentation client/serveur/edge, global-error, confidentialité (sendDefaultPii: false)

### Performance perçue

- **SWR** : listes (clients, articles, ventes, charges, paramètres, dashboard) avec swr-fetchers
- **Prefetch** : au survol des liens du menu (navigation.tsx)
- **Virtualisation** : DataTable avec @tanstack/react-virtual au-delà de 200 lignes (clients, articles, charges)
- **PDF** : Web Worker + lazy load (pdf.worker.ts, pdf-worker-client.ts)

---

## Priorité 1 – Réduction des délais (BDD, API, ressenti)

**Objectif** : Réduire les délais au chargement, à la création/modification/suppression et au premier clic de navigation.

| Action | Statut | Détail |
|--------|--------|--------|
| **Agrégation SQL dashboard** | ✅ Fait | KPIs, mensuels et répartition par service en requêtes SQL (SUM/GROUP BY, join articles pour fréquence). |
| **Optimistic updates** | ✅ Fait (toutes listes) | Clients, Articles, Ventes, Charges : mise à jour UI + cache SWR immédiate ; rollback + toast si erreur. |
| **Skeleton / loading par page** | ✅ Fait | loading.tsx sur dashboard, clients, articles, ventes, charges, paramètres (feedback immédiat au premier clic) |
| **Pooler + index en prod** | ✅ Checklist | Voir docs/PROD-CHECKLIST.md (DATABASE_POOLER_URL, migrations, index). À vérifier en prod. |

**À ne pas oublier** : En prod, DATABASE_POOLER_URL avec `?pgbouncer=true&connect_timeout=30&connection_limit=1`. Optimistic updates : rollback du cache SWR si l’API échoue.

---

## Priorité 2 – UX / navigation

**Objectif** : Mieux se repérer sans exposer de données sensibles.

| Action | Statut | Détail |
|--------|--------|--------|
| **Breadcrumbs** | ✅ Fait | Fil d’Ariane (ex. Dashboard > Clients > Détail), libellés **génériques** (pas de noms/filtres dans l’URL) |
| **Pas de filtres/noms sensibles dans l’URL** | ⬜ À respecter | Éviter de partager des liens avec données sensibles |

---

## Priorité 3 – Maintenabilité

**Objectif** : Code plus clair, build vérifié en continu.

| Action | Statut | Détail |
|--------|--------|--------|
| **CI (GitHub Actions)** | ✅ Fait | Build sur chaque push/PR (main, master) ; lint à réactiver après migration eslint CLI |
| **Types centralisés** | ✅ Fait | `src/lib/types.ts` : Client, Article, Sale, Charge, DashboardData, SalesResponse, etc. |
| **Composant liste réutilisable** | ✅ Fait | DataTable = composant standard (recherche, tri, pagination, virtualisation) ; doc dans docs/COMPOSANT-LISTE.md |

---

## Priorité 4 – Stabilité (compléments)

| Action | Statut | Détail |
|--------|--------|--------|
| **Rate limiting** | ⬜ Reporter | Login + forgot-password (limiter force brute) |
| **Variables d’env en prod** | ⬜ Vérifier | JWT, DATABASE_URL / pooler, Resend, Sentry |
| **Procédure de rollback** | ⬜ À définir | Savoir revenir en arrière après un déploiement (ex. Vercel) |

---

## Priorité 5 – Nice-to-have

| Action | Description |
|--------|-------------|
| Raccourcis clavier | Ex. D = Dashboard, C = Clients |
| Tests | E2E ou unitaires sur parcours / calculs critiques |
| Accessibilité | ARIA, focus visible, contraste (progressif) |
| Images | next/image + lazy load logos / uploads |
| États vides | Messages « Aucun client », « Aucune vente » + CTA « Créer… » |
| Validation formulaire | Erreurs inline à côté des champs (Zod déjà en place) |

---

## Checklist avant / en prod

- [ ] **Index BDD** : migration des index perf appliquée en prod (et en local si même base)
- [ ] **Pooler** : DATABASE_POOLER_URL configuré en prod (voir docs/PROD-CHECKLIST.md)
- [ ] **Variables d’env** : JWT, Resend, Sentry (optionnel)
- [ ] **Performance** : agrégation SQL dashboard, optimistic updates (voir Priorité 1)
- [x] **Breadcrumbs** : en place, sans infos sensibles dans l’URL
- [x] **CI** : build sur chaque PR (voir .github/workflows/ci.yml)
- [ ] **Rollback** : procédure documentée

---

## Références techniques

### Sentry (déjà en place)

- Variables : `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (CI)
- Fichiers : instrumentation.ts, instrumentation-client.ts, sentry.*.config.ts, global-error.tsx, next.config.ts (withSentryConfig)
- Confidentialité : sendDefaultPii: false, Replay maskAllText / blockAllMedia

### Performance – Trois étages (BDD, API, React)

| Étage | Fait | À faire |
|-------|------|--------|
| **BDD** | Indexation, agrégation SQL dashboard ✅ | Pooler en prod |
| **API** | Cache dashboard 5 min | Optimistic updates ✅ (clients) ; étendre aux autres listes |
| **App** | useMemo/memo, virtualisation listes, PDF worker | Skeleton pendant chargement |
| **Réseau** | SWR, prefetch menu, compression Next | — |

Principe : calcul à la source (SQL) plutôt que « tout charger puis sommer en JS » ; éviter N+1.

### Autres optimisations (non prioritaires)

- BDD : vues matérialisées pour stats lourdes (optionnel)
- Pagination par curseur pour scroll infini
- Cookies : httpOnly, secure (prod), sameSite

---

*Dernière mise à jour : roadmap réorganisée (priorités et visu).*
