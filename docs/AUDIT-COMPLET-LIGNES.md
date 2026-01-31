# Audit complet du projet ARES Dashboard (par zone et par ligne)

**Date :** 30 janvier 2025  
**Périmètre :** Tout le code source après les corrections (articles, settings, ventes/TVA).

---

## 1. Configuration projet

### package.json
- **L.1–24** : name, version, main (electron), homepage, scripts OK. `eslint: ignoreDuringBuilds` désactive la vérification ESLint au build.
- **L.25–51** : Dépendances utilisées (Prisma, Radix, bcrypt, jose, jsonwebtoken, Next, React, Zod, etc.). Pas de dépendance orpheline évidente.
- **L.52–66** : devDependencies OK. Pas de `@tanstack/react-query` (supprimé).

### next.config.ts
- **L.3–12** : experimental (optimizeCss, optimizePackageImports lucide/recharts), images unoptimized (Electron), webpack splitChunks en prod. Pas de config redondante.

### tsconfig.json
- **L.2–24** : strict, paths @/*, target ES2017, next plugin. Include/exclude cohérents.

### prisma/schema.prisma
- **L.9–11** : datasource PostgreSQL, env DATABASE_URL.
- **L.14–31** : User (id, email, password, firstName, lastName, company). Relations clients, articles, sales, charges, parameters.
- **L.33–55** : Client — clientName @id (unique global), userId. Relation Charge.
- **L.56–76** : Article — serviceName @id (unique global), userId, billingFrequency, options.
- **L.77–90** : ServiceOption — lié à Article par serviceName.
- **L.91–130** : Sale — invoiceNo @id, userId optionnel (historique), pas de FK Client/Article.
- **L.131–168** : Charge — userId, linkedService, linkedClient, article/client en relation optionnelle.
- **L.169–196** : Quote, **L.197–227** : Invoice — pas de relation FK.
- **L.228–242** : ParametresEntreprise — **key @id** (unique global) + userId. En pratique le seed crée une ligne par (userId, key) ; si la base autorise plusieurs lignes par key (contrainte composite), le schéma devrait être `@@id([userId, key])` pour refléter le multi-utilisateur.

---

## 2. Middleware (src/middleware.ts)

- **L.5** : `JWT_SECRET` avec fallback `'your-secret-key...'` — **à corriger en prod** : exiger une variable d’environnement.
- **L.7–8** : publicPages et publicApiRoutes corrects.
- **L.10–12** : isPublicApi gère pathname + query.
- **L.14–22** : Si page publique ou API publique → next().
- **L.23–24** : Lecture du cookie auth-token.
- **L.26–30** : Détection requête API ou RSC/prefetch.
- **L.32–37** : Pas de token → 401 (API/RSC) ou redirect /login.
- **L.39–48** : Vérification JWT avec jose (Edge), en-têtes x-user-id et x-user-email. OK.
- **L.49–54** : Catch → 401 ou redirect. OK.
- **L.56–61** : Matcher exclut _next/static, _next/image, favicon.ico, images. OK.

---

## 3. Layout racine (src/app/layout.tsx)

- **L.1–5** : Metadata, Inter, globals.css, AuthProvider, AppLayout. OK.
- **L.7–13** : metadata (title, description, icons), viewport. OK.
- **L.16–26** : RootLayout : html lang fr, body avec font, AuthProvider puis AppLayout. OK.

### globals.css
- **L.1–26** : Tailwind, custom-variant dark, @theme inline (couleurs, radius). OK.
- **L.27–46** : :root (couleurs sombres, sidebar). OK.
- **L.48–68** : base (border-box, scroll, safe-area, body). OK.
- **L.70–88** : sidebar-content (régions, nav-item, section-label). OK.
- **L.90–97** : auth-page (inputs lisibles, placeholder, autofill). OK.
- **L.99–113** : scrollbar. OK.
- **L.115–126** : liquid-glass-card. OK.
- **L.128–134** : prefers-reduced-motion. OK.

---

## 4. Authentification

### lib/auth.ts
- **L.6** : Même fallback JWT_SECRET qu’en middleware — **à sécuriser en prod**.
- **L.15–21** : hashPassword (bcrypt 12), verifyPassword. OK.
- **L.23–32** : generateToken (jwt), verifyToken. Middleware utilise jose (Edge), ici jsonwebtoken (Node) — même secret et format attendus.
- **L.35–68** : getCurrentUser : priorité x-user-id (middleware), sinon cookie ou Authorization, puis prisma.user. OK.
- **L.70–84** : requireAuth(handler). OK.

### api/auth/login/route.ts
- **L.16–31** : Gestion form-urlencoded et JSON, Zod loginSchema (rememberMe transform). OK.
- **L.33–62** : User trouvé, mot de passe vérifié, token selon rememberMe (30d / 12h). OK.
- **L.77–97** : wantsRedirect → 200 + HTML + Set-Cookie (éviter 302 pour enregistrement cookie). OK.
- **L.99–105** : Réponse JSON + cookie. OK.
- **L.106–121** : Gestion ZodError et 500. OK.

### api/auth/register/route.ts
- **L.14–62** : body JSON, Zod, existingUser, hashPassword, create user, createMany ParametresEntreprise (userId). OK.
- **L.63–76** : Réponse JSON + cookie (7j). OK.
- **L.77–93** : Gestion erreurs. OK.

### api/auth/me/route.ts
- **L.4–16** : getCurrentUser, retour { user }. OK.

### api/auth/logout/route.ts
- **L.3–18** : Cookie auth-token vidé (maxAge 0). OK.

### components/auth-provider.tsx
- **L.26–42** : checkAuth au mount (fetch /api/auth/me, credentials include). OK.
- **L.45–65** : login (fetch /api/auth/login), setUser si OK. OK.
- **L.66–86** : register, logout. OK.
- **L.108–114** : useAuth, throw si hors AuthProvider. OK.

### app/login/page.tsx
- **L.36–71** : handleSubmit : formulaire dynamique POST vers /api/auth/login?redirect=true (cookie + redirect). OK.
- **L.24–34** : useEffect redirection si user ; searchParams error. OK.
- **L.73–84** : authLoading / user → chargement ou null. OK.
- **L.86–185** : Formulaire (email, password, rememberMe, showPassword, erreur). OK.

### app/register/page.tsx
- **L.41–88** : handleSubmit avec electronFetch /api/auth/register, validation mot de passe / confirmation. OK.
- **L.104–119** : Écran succès avec styles inline (couleurs en dur) — **améliorable** : utiliser variables CSS / Tailwind comme login.
- **L.121–302** : Formulaire avec nombreux style={{ }} — idem, harmoniser avec le thème.

---

## 5. Layout applicatif (AppLayout, navigation)

### components/layout/AppLayout.tsx
- **L.11–16** : AUTH_PATHS, isAuth, drawerOpen. OK.
- **L.18–29** : useEffect fermer drawer sur pathname/resize, overflow body. OK.
- **L.31** : Si isAuth → children seuls (pas de sidebar). OK.
- **L.34–54** : Header mobile (Logo, bouton menu). OK.
- **L.56–67** : Overlay (opacity, pointerEvents). OK.
- **L.69–97** : Tiroir mobile (aside, SidebarContent, onNavigate). OK.
- **L.99–106** : Sidebar desktop (lg). OK.
- **L.108–118** : main, contenu. OK.
- **L.124–147** : SidebarContent (header, NavLinks, UserMenu). OK.

### components/navigation.tsx
- **L.9–20** : mainNav, secondaryNav. OK.
- **L.22–24** : Navigation = NavLinks + UserMenu (utilisé dans AppLayout dans la sidebar, pas en double). OK.
- **L.26–78** : NavLinks (pathname, linkClass, prefetch false). OK.
- **L.81–105** : UserMenu (logout puis window.location.href = '/login'). OK.

---

## 6. API – Données métier

### api/articles/route.ts
- **L.9–18** : GET : getCurrentUser, 401 si pas user, findMany **where: { userId: user.id }**. Corrigé.
- **L.19–37** : Catch : re-getCurrentUser, $queryRaw **WHERE "userId" = ${user.id}**. Corrigé.
- **L.41–65** : POST : getCurrentUser, createArticleSchema, existingArticle par serviceName (unique global), create avec userId. OK.
- **L.49–51** : existingArticle ne filtre pas par userId — cohérent avec serviceName @id (un seul article par nom). OK.

### api/articles/[serviceName]/route.ts
- **L.8–38** : PUT : pas de getCurrentUser — **n’importe quel utilisateur connecté peut modifier n’importe quel article** (update par serviceName). À corriger : getCurrentUser + vérifier article.userId === user.id.
- **L.71–95** : DELETE : idem, pas de vérification utilisateur. À corriger.

### api/settings/route.ts
- **L.6–18** : GET : getCurrentUser, findMany **where: { userId: user.id }**. Corrigé.
- **L.27–45** : POST : body key/value, upsert. **L.41** : where: { key } — si key est @id unique global, un seul paramètre par key (partagé entre utilisateurs) ; si la base est multi-utilisateur par (userId, key), le schéma Prisma devrait avoir @@id([userId, key]) et l’upsert un where composite.
- **L.54–62** : Sync TVA : findMany **where: { userId: user.id }**. Corrigé.

### api/sales/route.ts
- **L.12–90** : GET : getCurrentUser, cache par user, where OR userId / userId null, pagination. OK.
- **L.93–150** : POST : getCurrentUser, createSaleSchema, optionsTotal, **tvaParam findFirst userId + key defaultTvaRate**, **calculateSaleAmounts(..., tvaRate)**. Corrigé.

### api/sales/[invoiceNo]/route.ts
- **L.8–76** : PUT : getCurrentUser, optionsTotal, **tvaParam + calculateSaleAmounts(..., tvaRate)**. Corrigé.
- **L.57–65** : update sans vérifier sale.userId — **un utilisateur peut modifier la vente d’un autre** si il connaît invoiceNo. À corriger : vérifier sale.userId === user.id (ou null pour legacy) avant update.
- **L.79–99** : DELETE : pas de getCurrentUser — **n’importe qui peut supprimer n’importe quelle vente**. À corriger.

### api/charges/route.ts
- **L.8–56** : GET : getCurrentUser, where userId, pagination, search, year. OK.
- **L.66–127** : POST : getCurrentUser, createChargeSchema, chargeData avec userId. OK.

### api/charges/[id]/route.ts
- **L.8–75** : PUT : getCurrentUser, existingCharge, **existingCharge.userId !== user.id → 404**. OK.
- **L.77–105** : DELETE : getCurrentUser, vérification userId. OK.

### api/clients/route.ts
- **L.8–18** : GET : getCurrentUser, findMany **where: { userId: user.id }**. OK.
- **L.49–57** : existingClient findUnique par clientName (clientName @id global) — empêche deux utilisateurs d’avoir le même nom de client. Cohérent si design “nom client global”.

### api/service-options/route.ts
- **L.15–32** : GET : pas de getCurrentUser. Retourne les options pour un serviceName (ou tous si pas de query). **Un utilisateur peut voir les options des articles des autres** (serviceName partagé ou autre). À corriger : getCurrentUser + vérifier que l’article (serviceName) appartient à user.id avant de renvoyer les options.
- **L.42–68** : POST : pas de getCurrentUser. **N’importe qui peut créer une option pour n’importe quel serviceName.** À corriger : getCurrentUser + vérifier article.userId === user.id.

### api/dashboard/route.ts
- **L.9–28** : requireAuth, params (year, range, custom), findFirst parametres (userId + key) pour tauxUrssaf/defaultTvaRate, cache par user. OK.
- **L.60–141** : sales/charges/groupBy/articles avec **userId ou null** (ventes), **userId** (charges), articles **userId**. OK.
- **L.142–147** : select articles avec billingFrequency (type assert). OK.
- Reste du fichier : KPIs, monthlyData, serviceDistribution, cache, réponse. OK.

### api/dashboard/evolution/route.ts, api/charges/breakdown/route.ts
- Déjà lus : getCurrentUser, filtrage par userId. OK.

---

## 7. Lib

### lib/math.ts
- **L.9–33** : calculateSaleAmounts(quantity, unitPriceHt, optionsTotal, **tvaRate?**). Si tvaRate fourni (serveur), utilisation directe ; sinon getCompanySettings (client). Corrigé.
- **L.36–57** : calculateDashboardKPIs. OK.
- **L.59–76** : calculateMonthlyData. OK.
- **L.78–91** : calculateServiceDistribution. OK.

### lib/db.ts
- **L.1–9** : Singleton Prisma (globalThis en dev). OK.

### lib/settings.ts
- **L.13–46** : getCompanySettings : electronFetch('/api/settings') — à utiliser **uniquement côté client** (navigateur/Electron avec cookie). Ne pas appeler depuis les routes API. OK après correction ventes (taux lu en base dans la route).

### lib/electron-api.ts
- **L.4–18** : electronFetch (credentials include, Content-Type). OK.
- **L.21–35** : fetchDashboard, fetchChargesBreakdown, fetchDashboardEvolution, fetchSettings. OK.

### lib/validations.ts
- Schémas Zod (client, article, sale, charge, quote, invoice, options, parameter). Types exportés. OK.

---

## 8. Pages et contenu

### app/page.tsx (home)
- **L.6–11** : useEffect router.push('/dashboard'). OK.
- **L.13–19** : Message de redirection. OK.

### app/dashboard/page.tsx
- Titre + DashboardContent. OK.

### app/dashboard/dashboard-content.tsx
- État (dateRange, comparisonMode, data, chargesData, evolutionData, companySettings), loadDashboardData (Promise.all dashboard + charges/breakdown + evolution + settings), 401 → redirect, comparaison période précédente. Sous-composants Filters, KPIs, Comparison, Evolution, Charges, Services. OK.

### app/charges/charges-content.tsx, ChargeFormModal
- Load charges/articles/clients, CRUD, DataTable, export CSV. Gestion userId côté API. OK. Messages d’erreur en **alert()** — améliorable (toast ou message inline).

### app/sales/sales-content.tsx
- État en **any[]** pour sales/clients/articles — améliorable (typer Sale[], Client[], Article[]). Utilisation de calculateSaleAmounts côté client (sans tvaRate) via getCompanySettings dans PDF/calculs — OK car côté navigateur avec cookie. **alert()** pour erreurs — améliorable.

### app/clients/clients-content.tsx, app/articles/articles-content.tsx, app/settings/settings-content.tsx
- Logique alignée avec les API. Vérifier que les appels (electronFetch) envoient bien les cookies. OK.

---

## 9. Récapitulatif des corrections déjà faites

| Zone | Correction |
|------|------------|
| api/articles GET | Filtre userId + fallback raw avec userId. |
| api/settings GET | Filtre userId. |
| api/settings POST (sync TVA) | findMany ventes avec userId. |
| api/sales POST | Taux TVA lu en base (userId + key), passé à calculateSaleAmounts. |
| api/sales/[invoiceNo] PUT | getCurrentUser + taux TVA en base + optionsTotal + calculateSaleAmounts(..., tvaRate). |
| lib/math calculateSaleAmounts | Paramètre optionnel tvaRate pour usage serveur. |

---

## 10. Points restants à corriger ou à améliorer

### Sécurité / isolation
1. **middleware.ts + lib/auth.ts** : En production, ne pas utiliser le fallback `JWT_SECRET` ; exiger `process.env.JWT_SECRET`.
2. **api/articles/[serviceName]** : PUT et DELETE — ajouter getCurrentUser et vérifier que l’article appartient à l’utilisateur (article.userId === user.id).
3. **api/sales/[invoiceNo]** : PUT — vérifier que la vente appartient à l’utilisateur (sale.userId === user.id ou null) avant update. DELETE — ajouter getCurrentUser et même vérification avant delete.
4. **api/service-options** : GET et POST — getCurrentUser ; pour GET, ne renvoyer les options que si l’article (serviceName) appartient à user.id ; pour POST, vérifier que l’article appartient à user.id avant create.

### Schéma Prisma
5. **ParametresEntreprise** : Si la base autorise plusieurs lignes par (userId, key), passer à `@@id([userId, key])` (ou @@unique([userId, key])) pour éviter les conflits et refléter le multi-utilisateur.

### UX / code
6. **register/page.tsx** : Remplacer les couleurs en dur (style={{ }}) par des classes Tailwind / variables CSS comme sur login.
7. **charges, sales, etc.** : Remplacer **alert()** par toasts ou messages d’erreur inline.
8. **sales-content.tsx** : Typage explicite (Sale[], Client[], Article[]) au lieu de any[].
9. **api/settings POST** : Si paramètres par utilisateur, upsert doit cibler (userId, key) ; adapter le schéma et l’appel Prisma en conséquence.

---

## 11. Tableau de synthèse par fichier

| Fichier | Statut | Note |
|---------|--------|------|
| middleware.ts | OK | JWT fallback à supprimer en prod |
| lib/auth.ts | OK | Idem JWT |
| api/auth/* | OK | - |
| auth-provider, login, register | OK | Register : styles à harmoniser |
| AppLayout, navigation | OK | - |
| api/articles route GET/POST | OK | Corrigé (userId) |
| api/articles [serviceName] PUT/DELETE | À corriger | Ajouter vérification userId |
| api/settings | OK | GET/POST sync TVA corrigés |
| api/sales route | OK | TVA en base + tvaRate |
| api/sales [invoiceNo] PUT | OK | TVA corrigée ; ajouter vérif userId sur la vente |
| api/sales [invoiceNo] DELETE | À corriger | getCurrentUser + vérif userId |
| api/charges, api/clients | OK | - |
| api/service-options | À corriger | getCurrentUser + vérif article user |
| api/dashboard, evolution, charges/breakdown | OK | - |
| lib/math, db, settings, electron-api, validations | OK | - |
| dashboard-content, charges-content | OK | alert() à remplacer |
| sales-content | OK | Typage + alert() à améliorer |

---

**Conclusion :** Les corrections critiques (articles GET, settings GET/POST sync TVA, calcul TVA ventes) sont en place. Il reste à sécuriser les routes par ressource (articles PUT/DELETE, ventes PUT/DELETE, service-options), à exiger JWT_SECRET en prod, et à améliorer UX (messages d’erreur, styles register, typage sales).
