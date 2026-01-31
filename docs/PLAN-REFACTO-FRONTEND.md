# Plan de refactorisation frontend – ARES Dashboard

Document de référence pour repartir sur une base propre : layout, CSS, composants, dépendances.

---

## Vue d’ensemble

| Phase | Objectif | Priorité | Effort estimé |
|-------|----------|----------|----------------|
| 1 | Layout et navigation | Haute | 1–2 j |
| 2 | CSS global et thème | Haute | 0,5–1 j |
| 3 | Dashboard (découpage) | Haute | 1–2 j |
| 4 | Pages lourdes (sales, charges) | Moyenne | 1 j |
| 5 | Dépendances et perf | Moyenne | 0,5 j |
| 6 | Auth et formulaires | Basse | 0,5 j |

---

## Phase 1 – Layout et navigation

**Objectif** : Un seul shell (sidebar + main), un seul système responsive, plus de bidouilles z-index / double contrôle.

### 1.1 Structure cible

```
src/
  app/
    layout.tsx                    → font, metadata, viewport, AuthProvider
    (auth)/
      layout.tsx                  → pas de sidebar (optionnel)
      login/page.tsx
      register/page.tsx
    (app)/                        → routes protégées avec sidebar
      layout.tsx                  → AppShell (sidebar + main)
      dashboard/page.tsx
      clients/page.tsx
      ...
  components/
    layout/
      AppShell.tsx                → conteneur : sidebar + main
      Sidebar.tsx                 → contenu du menu (un seul composant)
      MobileDrawer.tsx            → wrapper drawer (mobile uniquement)
      MobileHeader.tsx            → barre + hamburger (mobile uniquement)
```

### 1.2 Étapes

1. **Créer `components/layout/`**
   - `Sidebar.tsx` : extraire le contenu actuel de `SidebarContent` (logo, NavLinks, UserMenu). Un seul composant, pas de duplication.
   - `MobileHeader.tsx` : barre fixe (logo + bouton menu), visible uniquement en mobile (`lg:hidden`).
   - `MobileDrawer.tsx` : panneau coulissant qui affiche `<Sidebar />` ; ouvert/fermé par state, un seul z-index (ex. 50).
   - `AppShell.tsx` : wrapper unique.
     - Desktop (lg+) : `flex row` → `<aside><Sidebar /></aside>` (sticky, 280px) + `<main>{children}</main>`.
     - Mobile : `flex col` → `<MobileHeader />` + `<MobileDrawer open={...} />` + `<main class="pt-14">...</main>`.
     - Pas de spacer, pas de z-index 200/180/170 : ordre DOM clair + un z-index pour le drawer (ex. 50).

2. **Simplifier le responsive**
   - Un seul critère : Tailwind `lg:` (1024px). Pas de media query CSS en doublon pour cacher la sidebar.
   - Sidebar desktop : `hidden lg:flex` + largeur 280px. Rien d’autre en CSS pour “forcer” le masquage.

3. **Remplacer `ConditionalLayout`**
   - Dans `app/layout.tsx` : si route auth → pas de shell ; sinon → `<AppShell>{children}</AppShell>`.
   - Ou : groupe de routes `(app)/layout.tsx` qui rend `<AppShell>`, et `(auth)` sans ce layout.
   - Supprimer `conditional-layout.tsx` une fois migré.

4. **Checklist Phase 1**
   - [x] Sidebar : un seul composant, plus de rendu en double (drawer + desktop).
   - [x] Un seul fichier de layout principal (AppShell).
   - [x] Z-index : header 50, drawer 50 (ou 40), main 0. Plus de 200/180/170.
   - [x] Plus de media query `max-width: 1023px` avec `!important` pour la sidebar.

---

## Phase 2 – CSS global et thème

**Objectif** : Moins de duplication, une seule source pour sidebar/drawer, moins de `!important`.

### 2.1 Fichiers concernés

- `src/app/globals.css`
- Suppression des styles dupliqués dans `login/page.tsx` et `register/page.tsx` (voir Phase 6).

### 2.2 Étapes

1. **Variables et base**
   - Garder `@theme inline` + `:root` + `.dark` pour les couleurs.
   - Garder base (html, body, scrollbar). Supprimer ou fusionner les doublons (ex. `min-height: 100dvh` en un seul endroit).

2. **Sidebar : une seule classe “contenu”**
   - Créer une classe unique pour le contenu du menu (ex. `.sidebar-content` ou garder `.app-sidebar-desktop` comme bloc commun).
   - Règles communes : `.sidebar-content .sidebar-region-header`, `.sidebar-region-body`, `.sidebar-region-footer`, `.sidebar-nav-item`, `.sidebar-nav-item-active`, `.sidebar-section-label`.
   - Desktop : le bloc qui contient `.sidebar-content` a `position: sticky`, `width: 280px`, etc. (ou tout en Tailwind dans le composant).
   - Drawer (mobile) : le même `.sidebar-content` dans un panneau `fixed` ; pas de deuxième jeu de règles (`.app-sidebar-drawer .sidebar-region-*`, etc.).

3. **Supprimer la media query “sécurité”**
   - Supprimer le bloc `@media (max-width: 1023px) { .app-sidebar-desktop { display: none !important; ... } }`.
   - Le masquage en mobile doit venir uniquement de Tailwind `hidden lg:flex` sur le wrapper.

4. **Auth**
   - Un seul bloc `.auth-page` dans globals.css pour champs (fond, texte, placeholder, autofill).
   - Supprimer les `<style>` ou `dangerouslySetInnerHTML` dans login et register (Phase 6).

5. **Liquid glass**
   - Garder `.liquid-glass` et `.liquid-glass-card` seulement s’ils sont utilisés ; sinon les supprimer.

6. **Checklist Phase 2**
   - [x] Une seule définition des règles “sidebar” (pas desktop + drawer séparés).
   - [x] Plus de `!important` pour cacher la sidebar.
   - [x] Réduction du nombre de lignes dans globals.css (cible : ~180–200).

---

## Phase 3 – Dashboard (découpage)

**Objectif** : Fichier principal < 300 lignes, sous-composants réutilisables, meilleur code-splitting.

### 3.1 Structure cible

```
src/app/dashboard/
  page.tsx                    → titre + <DashboardContent /> (court)
  dashboard-content.tsx        → état global, appels API, composition des blocs (< 200 lignes)
  components/                 → ou src/components/dashboard/
    DashboardFilters.tsx       → preset dates, personnalisé, comparaison ON/OFF
    DashboardKPIs.tsx          → grille KPI (utilise OptimizedKpiCard)
    DashboardComparison.tsx    → bloc comparaison temporelle
    DashboardEvolution.tsx     → graphiques évolution (LineChart)
    DashboardCharges.tsx       → résumé charges, camemberts par type/catégorie
    DashboardServices.tsx     → CA par service, graphiques services
```

### 3.2 Étapes

1. **Extraire les blocs**
   - `DashboardFilters` : select preset, champs date “Du/Au”, bouton Comparaison ON/OFF, affichage de la plage.
   - `DashboardKPIs` : réception des KPI en props, map sur `OptimizedKpiCard`.
   - `DashboardComparison` : affichage des variations (CA HT, Charges, Résultat net, Marge) si `comparisonData` présent.
   - `DashboardEvolution` : cartes + LineChart évolution (données en props).
   - `DashboardCharges` : résumé récurrent/ponctuel + Pie type + Pie catégorie.
   - `DashboardServices` : Pie CA par service + LineChart CA par service.

2. **Garder la logique dans `dashboard-content.tsx`**
   - État (dateRange, comparisonMode, data, loading, etc.) et appels API restent dans `dashboard-content.tsx`.
   - Ce fichier passe les données en props aux sous-composants (pas de fetch dans chaque bloc).

3. **Lazy load optionnel**
   - Si besoin de réduire le bundle initial : `const DashboardCharts = dynamic(() => import('./components/DashboardEvolution'), { ssr: false })` (ou avec loading).
   - À faire seulement si le bundle dashboard reste trop lourd après découpage.

4. **Checklist Phase 3**
   - [x] dashboard-content.tsx < 250 lignes.
   - [x] Chaque bloc dans un fichier dédié.
   - [x] Pas de duplication d’appels API ; données en props.

---

## Phase 4 – Pages lourdes (sales, charges)

**Objectif** : Alléger sales-content et charges-content pour faciliter maintenance et perf.

### 4.1 Sales

- **Structure** : `sales/page.tsx` + `sales-content.tsx` + éventuellement `components/sales/` (ou `sales/` local).
- Extraire :
  - Liste/tableau des ventes (avec filtres si présents) → `SalesList.tsx` ou garder dans content mais extraire la partie “liste”.
  - Modale création/édition vente → `SaleFormModal.tsx` (formulaire + soumission).
  - Bloc “options sélectionnées” / résumé si réutilisé → composant dédié.
- Objectif : `sales-content.tsx` < 400 lignes.

### 4.2 Charges

- Même idée : extraire liste des charges, modale création/édition, filtres.
- Objectif : `charges-content.tsx` < 250 lignes.

### 4.3 DataTable

- Garder un seul composant DataTable (recherche, tri, pagination, actions).
- Si besoin : extraire la “toolbar” (recherche + boutons Export/Import/Nouveau) en `DataTableToolbar.tsx` et la rendre optionnelle pour alléger l’usage.

### 4.4 Checklist Phase 4

- [ ] sales-content.tsx < 400 lignes (modale Sales à extraire en SaleFormModal si besoin).
- [x] charges-content.tsx < 250 lignes.
- [x] Modales de formulaire dans des composants dédiés (ChargeFormModal créé).

---

## Phase 5 – Dépendances et performance

**Objectif** : Supprimer l’inutile, optimiser les imports, réduire le bundle.

### 5.1 Dépendances

- **Supprimer** : `@tanstack/react-query` (non utilisé). Vérifier qu’aucun import ne reste.
- **Garder** : Radix (dialog, checkbox, label, select, slot), recharts, lucide-react, jspdf, papaparse, zod, etc. selon l’usage actuel.

### 5.2 Imports

- **Recharts** : dans les composants dashboard, n’importer que ce qui est utilisé (ex. `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`, `PieChart`, `Pie`, `Cell`, `Legend`). Déjà aidé par `optimizePackageImports` ; vérifier qu’il n’y a pas d’import global type `import * as Recharts`.
- **lucide-react** : déjà optimisé par Next ; garder des imports ciblés par composant.

### 5.3 Next.js

- Garder `optimizePackageImports` pour `lucide-react` et `recharts`.
- Si besoin : `dynamic` pour les vues les plus lourdes (ex. dashboard charts) avec un fallback skeleton.

### 5.4 Checklist Phase 5

- [x] React Query retiré du projet.
- [x] Aucun import inutilisé en masse (Recharts, lucide).
- [x] next.config.ts propre (pas de config inutile).

---

## Phase 6 – Auth et formulaires

**Objectif** : Un seul endroit pour les styles auth ; formulaires cohérents.

### 6.1 Styles auth

- Centraliser dans `globals.css` : `.auth-page input`, `.auth-page input::placeholder`, `.auth-page input:-webkit-autofill`, etc.
- Supprimer de `login/page.tsx` et `register/page.tsx` : balise `<style>` ou `dangerouslySetInnerHTML` qui redéfinissent les mêmes règles.

### 6.2 Formulaires (optionnel)

- Si les modales (clients, articles, ventes, charges) partagent beaucoup de champs : envisager des composants partagés (ex. `FormField`, `FormActions`) pour éviter la duplication de structure. À faire seulement si le gain est clair.

### 6.3 Checklist Phase 6

- [x] Styles champs auth uniquement dans globals.css.
- [x] Login et register sans styles inline dupliqués (dangerouslySetInnerHTML supprimé).

---

## Ordre recommandé d’exécution

1. **Phase 2 (CSS)** en premier : nettoyer globals et sidebar sans toucher encore à la structure des composants (juste renommer / fusionner les classes). Ça évite de casser le layout pendant la Phase 1.
2. **Phase 1 (Layout)** : introduire AppShell, Sidebar, MobileHeader, MobileDrawer, et basculer le layout dessus ; supprimer conditional-layout.
3. **Phase 5 (Dépendances)** : retirer React Query, vérifier les imports. Rapide et sans risque.
4. **Phase 3 (Dashboard)** : découper dashboard-content en blocs.
5. **Phase 4 (Sales / Charges)** : découper sales et charges.
6. **Phase 6 (Auth)** : centraliser les styles auth et nettoyer login/register.

---

## Critères de succès

- Layout : un seul shell, un seul Sidebar, z-index simples (0, 50 max), plus de media query “sécurité” en !important.
- CSS : une seule définition des règles sidebar ; globals.css < 200 lignes ; pas de styles auth dupliqués.
- Dashboard : fichier principal < 250 lignes ; 5–6 sous-composants clairs.
- Sales/Charges : fichiers principaux < 400 / 250 lignes ; modales extraites.
- Dépendances : React Query retiré ; imports Recharts/lucide ciblés.
- Perf : temps de chargement et taille de bundle stables ou en baisse après refacto.

---

## Fichiers à créer / modifier (résumé)

| Action | Fichier / dossier |
|--------|-------------------|
| Créer | `components/layout/AppShell.tsx` |
| Créer | `components/layout/Sidebar.tsx` |
| Créer | `components/layout/MobileHeader.tsx` |
| Créer | `components/layout/MobileDrawer.tsx` |
| Créer | `app/dashboard/components/DashboardFilters.tsx` (+ KPIs, Comparison, Evolution, Charges, Services) |
| Modifier | `app/layout.tsx` (utiliser AppShell) |
| Modifier | `app/globals.css` (fusion sidebar, suppr. media query, auth centralisé) |
| Modifier | `app/dashboard/dashboard-content.tsx` (déléguer aux sous-composants) |
| Modifier | `app/login/page.tsx`, `app/register/page.tsx` (suppr. styles inline) |
| Créer | `app/charges/components/ChargeFormModal.tsx` |
| Supprimer | `components/conditional-layout.tsx` (après migration) — fait |
| Supprimer | Dépendance `@tanstack/react-query` — fait |

Tu peux suivre ce plan phase par phase et cocher les checklists au fur et à mesure. Si tu veux, on peut détailler la Phase 1 ou 2 étape par étape (concret fichier par fichier) pour enchaîner l’implémentation.
