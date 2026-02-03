# Documentation complète – ARES Dashboard

Document de référence décrivant **tout** ce que fait le projet : fonctionnalités, pages, boutons, graphiques, API, modèles de données et utilitaires.

---

## 1. Vue d’ensemble du projet

**ARES Dashboard** est une application web (Next.js) de **gestion commerciale et financière** pour freelances / petites structures :

- **Authentification** : inscription, confirmation par email, connexion, mot de passe oublié / réinitialisation.
- **Données métier** : clients, articles/services (avec options), ventes (factures), charges.
- **Dashboard** : KPIs, évolution temporelle, répartition CA par service, analyse des charges, comparaison période précédente.
- **Paramètres** : entreprise, logo, TVA, URSSAF, export/import, réinitialisation BDD.

Les données sont **par utilisateur** (multi-tenant) : chaque compte voit uniquement ses clients, articles, ventes et charges. L’app peut tourner en **web** (Vercel, etc.) ou en **Electron** (desktop) ; les requêtes passent par `fetch` avec cookies pour l’auth.

---

## 2. Architecture technique

- **Front** : Next.js (App Router), React, SWR (cache + revalidation), Recharts (graphiques), Sonner (toasts), composants UI (shadcn/ui).
- **Back** : routes API Next.js (`src/app/api/`), Prisma, PostgreSQL.
- **Auth** : JWT dans un cookie httpOnly (`auth-token`), vérifié par le middleware ; `x-user-id` / `x-user-email` injectés en en-têtes pour les API protégées.
- **Données** : SWR avec clés dédiées (`clients`, `articles`, `sales`, `charges`, `settings`, `dashboard-...`), optimistic updates sur les listes, prefetch des routes au survol/focus du menu.

---

## 3. Modèles de données (Prisma)

### 3.1 User

- `id`, `email`, `password` (bcrypt), `firstName`, `lastName`, `company`, `emailVerifiedAt`, `createdAt`, `updatedAt`.
- **Relations** : clients, articles, sales, charges, parameters (ParametresEntreprise).
- Un compte doit avoir **email vérifié** (`emailVerifiedAt` non null) pour se connecter.

### 3.2 Client

- Clé composite `(userId, clientName)`.
- Champs : `firstName`, `lastName`, `email`, `phone`, `website`, `company`.
- `clientName` = identifiant métier (souvent `"Prénom Nom"`).

### 3.3 Article

- Clé composite `(userId, serviceName)`.
- Champs : `serviceName`, `priceHt`, `billByHour`, `billingFrequency` (ponctuel | mensuel | annuel), `type` (service | produit), `description`.
- **Relations** : options (ServiceOption), charges liées.

### 3.4 ServiceOption

- `id`, `userId`, `serviceName`, `name`, `description`, `priceHt`, `isDefault`.
- Options ajoutées à un article (ex. "Base de données", "Formation") ; sélectionnables lors de la création d’une vente.

### 3.5 Sale

- Clé composite `(userId, invoiceNo)`.
- Champs : `saleDate`, `clientName`, `serviceName`, `quantity` (heures ou 1), `unitPriceHt`, `unitLabel` (heure | forfait), `caHt`, `tvaAmount`, `totalTtc`, `options` (JSON), `year`, `quoteId`, `invoiceId`.

### 3.6 Charge

- `id`, `userId`, `expenseDate`, `category`, `vendor`, `description`, `amount`, `recurring`, `recurringType` (mensuel | annuel | ponctuel), `paymentMethod`, `notes`, `linkedService`, `linkedClient`, `linkedSaleId`, `year`.

### 3.7 ParametresEntreprise

- Clé composite `(userId, key)`.
- Clés typiques : `companyName`, `companyAddress`, `companyPhone`, `companyEmail`, `siret`, `logoPath`, `defaultTvaRate`, `tauxUrssaf`.

### 3.8 Quote / Invoice

- Modèles présents en base (quotes, invoices) ; utilisés côté PDF (devis/facture) et éventuellement par d’autres API.

---

## 4. Authentification

### 4.1 Pages et flux

| Page | URL | Rôle |
|------|-----|------|
| **Connexion** | `/login` | Formulaire email + mot de passe. Option « Se souvenir de moi ». Lien « Mot de passe oublié » et « S’inscrire ». |
| **Inscription** | `/register` | Formulaire : prénom, nom, email, entreprise (optionnel), mot de passe, confirmation. Pas de connexion auto : envoi d’un **email de confirmation**. |
| **Confirmation email** | `/confirm-email` | Page traitant le lien reçu par email : validation du token, mise à jour `emailVerifiedAt`, envoi email de bienvenue. Puis redirection vers login. |
| **Mot de passe oublié** | `/forgot-password` | Saisie email → envoi d’un lien de réinitialisation (si compte existant et email configuré). |
| **Réinitialisation mot de passe** | `/reset-password` | Formulaire nouveau mot de passe (token dans l’URL). |

### 4.2 Comportement détaillé

**Login (`/login`)**

- **Champs** : Email, Mot de passe, case « Se souvenir de moi », lien « Mot de passe oublié ».
- **Bouton « Se connecter »** : appelle `login(email, password, rememberMe)`. Si succès → prefetch des routes app, warmup APIs, preload SWR, redirection `/dashboard`. Si compte non vérifié (`email_not_verified`) → message d’erreur + bouton **« Renvoyer l’email de confirmation »**.
- **Lien « S’inscrire »** : vers `/register`.

**Register (`/register`)**

- **Bouton « Créer mon compte »** : POST `/api/auth/register`. Pas de connexion automatique : message de succès « Un email de confirmation vous a été envoyé » puis redirection vers `/login` après 3 s.
- **Lien « Se connecter »** : vers `/login`.

**Confirm email (`/confirm-email`)**

- Lit le token dans l’URL, appelle GET/POST `/api/auth/confirm-email`. Met à jour `emailVerifiedAt` et envoie l’email de bienvenue. Redirection login avec `?verified=1`.

**Forgot password (`/forgot-password`)**

- **Bouton** : POST `/api/auth/forgot-password` avec `{ email }`. Message « Si un compte existe, un email a été envoyé » (et éventuellement lien de test si email non configuré en dev).

**Reset password (`/reset-password`)**

- Formulaire nouveau mot de passe ; token passé dans l’URL. POST `/api/auth/reset-password`.

### 4.3 API Auth (résumé)

| Route | Méthode | Rôle |
|-------|---------|------|
| `/api/auth/login` | POST | Connexion ; rejette si `emailVerifiedAt` null (403). |
| `/api/auth/register` | POST | Création compte + envoi email confirmation. |
| `/api/auth/confirm-email` | GET/POST | Validation token + mise à jour `emailVerifiedAt` + email bienvenue. |
| `/api/auth/forgot-password` | POST | Envoi lien réinitialisation (Resend ou SMTP). |
| `/api/auth/reset-password` | POST | Réinitialisation mot de passe avec token. |
| `/api/auth/resend-confirmation` | POST | Renvoi email de confirmation (rate limit). |
| `/api/auth/logout` | POST | Suppression cookie auth. |
| `/api/auth/me` | GET | Utilisateur courant (pour auth provider). |

---

## 5. Page Dashboard

**URL** : `/dashboard`.  
**Contenu** : Filtres de période, KPIs, comparaison temporelle (optionnelle), évolution annuelle, charges (résumé + graphiques), répartition CA par service et analyse services/clients.

### 5.1 Filtres (DashboardFilters)

- **Liste déroulante « Période »** : YTD, Ce mois, Mois dernier, Cette année, Année dernière, Cette semaine, Semaine dernière, Personnalisé.
- **Si « Personnalisé »** : deux champs date « Du » et « Au ».
- **Bouton « Comparaison ON / OFF »** : active ou désactive le bloc **Comparaison Temporelle** (période courante vs période précédente de même durée).
- **Indicateur de rafraîchissement** : « Mise à jour… » avec spinner quand `isValidating`.
- **Dates affichées** : `dateRange.start` — `dateRange.end` en bas à droite.

### 5.2 Indicateurs clés (DashboardKPIs)

Cartes KPI générées à partir des données dashboard + paramètres (TVA, URSSAF) et, si comparaison activée, des variations en % :

| KPI | Signification | Variation (si comparaison) |
|-----|----------------|----------------------------|
| **CA HT** | Chiffre d’affaires HT sur la période | % vs période précédente |
| **Charges** | Total charges HT (récurrentes démultipliées selon période) | % (baisse = positif) |
| **TVA Totale** | caTtc − caHt | Taux TTC (ex. 20 %) |
| **Résultat Brut** | CA HT − Charges | Légende « CA HT − Charges » |
| **Marge Moyenne** | (Résultat net / CA HT) × 100 | % vs période précédente |
| **Prélèvement URSSAF** | CA HT × taux URSSAF % | Ex. « 22 % du CA HT » |
| **Résultat Net** | Après charges et URSSAF | % vs période précédente |
| **Nombre de clients** | Nombre de clients avec au moins une vente (évolution) | « X ventes » |

Les couleurs de variation : vert = bon (hausse CA, résultat, marge ; baisse charges), rouge = inverse.

### 5.3 Comparaison temporelle (DashboardComparison)

Affichée seulement si **Comparaison ON** et données période précédente chargées.

- **Bloc** : 4 colonnes — CA HT, Charges, Résultat Net, Marge.
- **Valeurs** : pourcentages de variation (ex. +12,3 %, −5,1 %) avec couleur (vert/rouge) selon que la variation est favorable ou non.
- **Source** : `comparison-utils.calculateComparison(currentData, previousData, currentRange, previousRange)` ; période précédente = même durée, juste avant la période courante.

### 5.4 Évolution temporelle (DashboardEvolution)

- **Titre** : « Évolution Temporelle ».
- **Graphique principal (LineChart)** : « Vue d’ensemble [année] » — 3 courbes :
  - **CA HT** (`sales.totalHt`) par mois.
  - **Charges HT** (`charges.totalHt`) par mois.
  - **Résultat** (`result` = CA HT − Charges) par mois.
- **Graphique secondaire** : « Rentabilité [année] » — une courbe **Résultat HT** par mois.
- **Données** : `evolutionData.monthlyEvolution` (API `/api/dashboard/evolution?year=...`). Tooltips en €.

### 5.5 Analyse des charges (DashboardCharges)

- **Résumé des charges** : deux blocs — **Récurrentes** (total €) et **Ponctuelles** (total €).
- **Graphique « Répartition par Type »** : camembert Récurrentes vs Ponctuelles (€).
- **Graphique « Répartition par Catégorie »** : camembert par catégorie (ex. Fournitures, Hébergement) avec total par catégorie.
- **Bloc « Détail des Catégories »** : liste catégorie → montant total (grille de cartes).
- **Source** : API `/api/charges/breakdown` (même période que le dashboard), avec démultiplication des récurrentes (mensuel × mois, annuel selon règle).

### 5.6 Analyse des services (DashboardServices)

- **Graphique « Répartition CA par Service »** : camembert (Recharts) — part de chaque service dans le CA total (période dashboard). Labels en %.
- **Graphique « CA par Service avec courbes »** : LineChart — une courbe par service, CA HT par mois sur l’année (`monthlyServiceEvolution`). Si pas de données : message « Aucune donnée d’évolution disponible ».
- **Cartes « Services Liés »** : pour chaque service (avec ventes ou charges) — nom, prix unitaire, nb ventes, CA total, nb clients.
- **Cartes « Clients Liés »** : pour chaque client (avec ventes ou charges) — nom, contact, nb ventes, CA, charges, nb services.

Données : `serviceDistribution` (dashboard), `evolutionData.monthlyServiceEvolution`, `serviceAnalysis`, `clientAnalysis` (evolution API).

### 5.7 Chargement et erreur

- **Loading** : skeletons (filtres, grille KPIs, emplacements graphiques).
- **Erreur** : message « Erreur lors du chargement des données » + bouton **« Réessayer »** (mutate SWR).

---

## 6. Page Clients

**URL** : `/clients`.  
**Contenu** : bandeau astuce, DataTable (liste clients), boutons Créer / Exporter, dialog création/édition.

### 6.1 Boutons et actions

| Élément | Action |
|--------|--------|
| **Créer (ou « Nouveau »)** | Ouvre le dialog « Nouveau client » (formulaire vide). |
| **Exporter** | Génère un CSV des colonnes (firstName, lastName, clientName, email, phone, website, company) et téléchargement. |
| **Recherche** | Filtre la liste en temps réel (tous les champs). |
| **Colonnes triables** | Clic sur en-tête Prénom / Nom pour tri asc/desc. |
| **✏️ Modifier** (ligne) | Ouvre le dialog avec le client pré-rempli ; sauvegarde = PUT `/api/clients/:clientName`. |
| **🗑️ Supprimer** (ligne) | Confirmation puis DELETE `/api/clients/:clientName`. Rollback liste + toast si erreur. |

### 6.2 Colonnes du tableau

Prénom, Nom, Email (lien mailto), Téléphone (lien tel), Entreprise, Site web (lien). Valeurs vides affichées comme « Non renseigné ».

### 6.3 Dialog client (création / édition)

- **Champs** : Prénom *, Nom *, Email, Téléphone, Entreprise, Site web.
- **Boutons** : Annuler, Créer / Modifier.
- **Comportement** : Optimistic update (liste mise à jour tout de suite) ; en cas d’erreur API, rollback + toast + message d’erreur sous le formulaire. `clientName` en création = `"Prénom Nom".trim()`.

### 6.4 Raccourci

- Événement `shortcut-new` (ex. raccourci clavier « Nouveau ») ouvre le dialog d’ajout.

---

## 7. Page Articles

**URL** : `/articles`.  
**Contenu** : bloc « Créer vos services et options » (workflow), DataTable (liste articles), dialog création/édition article, dialog **Options** par service (⚙️).

### 7.1 Boutons et actions

| Élément | Action |
|--------|--------|
| **Créer un article** | Ouvre le dialog « Nouvel article » (nom service, prix, facturation à l’heure, type, régularité). |
| **Exporter** | CSV (serviceName, priceHt, billByHour, type). |
| **⚙️ (par ligne)** | Ouvre le dialog **Options pour "[serviceName]"** : liste des options du service + formulaire pour en ajouter (nom, prix HT, description, « Option incluse par défaut »). Bouton supprimer par option. |
| **Recherche / Tri / Pagination** | Idem DataTable standard. |
| **✏️ Modifier** | Dialog édition article (PUT `/api/articles/:serviceName`). |
| **🗑️ Supprimer** | Confirmation puis DELETE `/api/articles/:serviceName`. |

### 7.2 Dialog article

- **Nom du service ***, **Facturer à l’heure** (checkbox), **Prix HT *** (par heure ou forfait), **Type** (Service / Produit), **Régularité** (Ponctuel / Mensuel / Annuel).
- Si « Facturer à l’heure » : texte d’aide indiquant que le nombre d’heures se saisit en page Ventes.
- Validation : nom non vide, prix > 0.

### 7.3 Dialog options

- **Ajouter une option** : Nom *, Prix HT, Description, case « Option incluse par défaut ». Bouton « Ajouter l’option » → POST `/api/service-options`.
- **Liste options** : nom, description, prix HT, badge « Par défaut » si besoin, bouton supprimer → DELETE `/api/service-options/:id`.

---

## 8. Page Ventes

**URL** : `/sales`.  
**Contenu** : boutons Export CSV et **Nouvelle Vente**, carte astuce, liste des ventes (cartes avec N° facture, client, service, total TTC, boutons Devis / Facture / Modifier / Supprimer), dialog création/édition vente.

### 8.1 Boutons principaux

| Élément | Action |
|--------|--------|
| **Export CSV** | Télécharge `ventes.csv` (N° Facture, Date, Client, Service, Quantité, Prix unitaire HT, CA HT, TVA, Total TTC). |
| **Nouvelle Vente** | Ouvre le dialog avec date du jour et N° facture proposé (GET `/api/sales/next-invoice-no` → ex. F2026-000001). |

### 8.2 Liste des ventes

Pour chaque vente :  
`[invoiceNo] - [clientName] - [serviceName]` | `[totalTtc]€` | **📄 Devis** | **🧾 Facture** | **✏️** | **🗑️**.

- **📄 Devis** : génération PDF devis (worker + `pdf-worker-client`, données enrichies avec client et taux TVA).
- **🧾 Facture** : génération PDF facture (même principe).
- **✏️** : Ouvre le dialog avec la vente pré-remplie (y compris options et charges liées).
- **🗑️** : Confirmation puis DELETE `/api/sales/:invoiceNo`.

### 8.3 Dialog vente (création / édition)

- **Date de vente**, **N° Facture** (éditable, pattern lettres/chiffres/tirets).
- **Client** : Select (liste des clients).
- **Service** : Select ; au changement, remplissage auto du prix unitaire HT et du libellé unité (heure / forfait), chargement des **options du service** (API service-options).
- **Quantité** : si facturation à l’heure = champ texte « Nombre d’heures * » (min 0,5) ; sinon nombre entier.
- **Prix unitaire HT** : pré-rempli depuis l’article, modifiable.
- **Options du service** : checkboxes pour chaque option (nom, +X€ HT). Résumé « Total options HT ».
- **Charges liées (optionnel)** : checkboxes pour associer des charges à cette vente (`linkedSaleId`). Résumé des charges sélectionnées.
- **Boutons** : Annuler, Créer / Modifier.

Calcul côté client : (unitPriceHt + somme options) × quantité → caHt ; TVA/total recalculés côté API avec taux paramètres. Sauvegarde : POST/PUT `/api/sales` puis mise à jour des `linkedSaleId` des charges concernées (PUT `/api/charges/:id`).

### 8.4 Raccourci

- `shortcut-new` ouvre le dialog Nouvelle vente.

---

## 9. Page Charges

**URL** : `/charges`.  
**Contenu** : titre, boutons **Exporter CSV** et **Nouvelle Charge**, bandeau astuce, DataTable (liste des charges), **ChargeFormModal** (dialog création/édition).

### 9.1 Boutons et actions

| Élément | Action |
|--------|--------|
| **Exporter CSV** | Colonnes : expenseDate, category, vendor, description, amount, recurringType, paymentMethod, linkedService, linkedClient. |
| **Nouvelle Charge** | Ouvre le modal avec formulaire vide (date du jour par défaut). |
| **Recherche / Tri / Pagination** | DataTable standard. |
| **✏️ Modifier** | Ouvre le modal avec la charge pré-remplie (PUT `/api/charges/:id`). |
| **🗑️ Supprimer** | Confirmation puis DELETE `/api/charges/:id`. |

### 9.2 Colonnes du tableau

Date, Catégorie, Fournisseur, Description, Montant, Type (badge mensuel/annuel/ponctuel), Service lié, Client lié.

### 9.3 ChargeFormModal

- **Champs** : Date *, Catégorie, Fournisseur, Description, Montant, Récurrent (checkbox), Type de récurrence (Mensuel / Annuel / Ponctuel), Moyen de paiement, Notes, **Service lié** (select articles), **Client lié** (select clients).
- **Boutons** : Annuler, Créer / Modifier.
- Optimistic update + rollback si erreur.

---

## 10. Page Paramètres

**URL** : `/settings`.  
**Contenu** : 4 cartes — Informations Entreprise, Logo, Paramètres Financiers, Gestion des Données.

### 10.1 Informations Entreprise

- **Champs** (édition au focus + bouton Sauvegarder) : Nom de l’entreprise, Adresse, Téléphone, Email, SIRET (14 chiffres).  
- Sauvegarde : POST `/api/settings` avec `{ key, value }`. Utilisés dans les PDF (devis/facture).

### 10.2 Logo de l’entreprise

- **Affichage** : image actuelle (logoPath) ou zone « Aucun logo uploadé ».
- **Remplacer / Uploader** : input file (PNG, JPG, SVG), POST `/api/upload-logo` (FormData avec `logo`). Toast succès/erreur.
- **Supprimer** : DELETE `/api/upload-logo`. Logo utilisé dans les PDF.

### 10.3 Paramètres Financiers

- **Taux TVA par défaut (%)** : utilisé pour calcul TVA des ventes et affichage dashboard.
- **Taux URSSAF (%)** : « Prélevé sur le CA HT » ; utilisé pour la carte Prélèvement URSSAF et Résultat Net sur le dashboard.

Sauvegarde : POST `/api/settings` par champ.

### 10.4 Gestion des Données

- **Exporter toutes les données** : GET `/api/export` → téléchargement JSON (nom fichier `ares-dashboard-export-YYYY-MM-DD.json`). *Note : la route `/api/export` peut ne pas exister dans le projet actuel ; le bouton appelle cette URL.*
- **Importer** : input file `.json`, POST `/api/import` avec le corps du fichier ; succès → `window.location.reload()`. *Idem : route `/api/import` à confirmer.*
- **Réinitialiser la base de données** : bouton destructif, confirmation « Action irréversible », POST `/api/reset` → rechargement de la page.

---

## 11. Navigation et layout

### 11.1 Menu (Navigation)

- **Menu** : Dashboard (`/dashboard`), Clients (`/clients`), Articles (`/articles`), Ventes (`/sales`), Charges (`/charges`).
- **Compte** : Paramètres (`/settings`).
- **Déconnexion** : bouton en bas de la sidebar ; appelle `logout()` puis redirection `/login`.

Liens avec `prefetch` et `onMouseEnter` / `onFocus` → `router.prefetch(href)` pour accélérer la navigation.

### 11.2 Racine et middleware

- **`/`** : redirection vers `/dashboard` si cookie auth présent, sinon `/login`.
- **Pages publiques** : `/login`, `/register`, `/forgot-password`, `/reset-password`, `/confirm-email`.
- **API publiques** : login, register, logout, forgot-password, reset-password, confirm-email, resend-confirmation.
- Toute autre route (page ou API) nécessite un JWT valide ; sinon 401 (API) ou redirection `/login` (pages).

---

## 12. API – Résumé des routes

### 12.1 Auth

- Voir section 4.3.

### 12.2 Clients

- **GET `/api/clients`** : liste des clients de l’utilisateur.
- **POST `/api/clients`** : création (body : firstName, lastName, email, phone, website, company). `clientName` = `firstName + " " + lastName`.
- **PUT `/api/clients/[clientName]`** : mise à jour.
- **DELETE `/api/clients/[clientName]`** : suppression.

### 12.3 Articles

- **GET `/api/articles`** : liste des articles (services) de l’utilisateur.
- **POST `/api/articles`** : création (serviceName, priceHt, billByHour, billingFrequency, type, etc.).
- **PUT `/api/articles/[serviceName]`** : mise à jour.
- **DELETE `/api/articles/[serviceName]`** : suppression.

### 12.4 Service Options

- **GET `/api/service-options?serviceName=...`** : options d’un service.
- **POST `/api/service-options`** : création (serviceName, name, description, priceHt, isDefault).
- **DELETE `/api/service-options/[id]`** : suppression.

### 12.5 Ventes

- **GET `/api/sales`** : liste des ventes (avec pagination).
- **GET `/api/sales/next-invoice-no`** : prochain numéro (ex. F2026-000001).
- **POST `/api/sales`** : création (saleDate, invoiceNo, clientName, serviceName, quantity, unitPriceHt, caHt, options, year, etc.). TVA/total calculés côté serveur (taux paramètres).
- **PUT `/api/sales/[invoiceNo]`** : mise à jour.
- **DELETE `/api/sales/[invoiceNo]`** : suppression.

### 12.6 Charges

- **GET `/api/charges`** : liste (query `limit`, pagination).
- **GET `/api/charges/breakdown`** : répartition pour le dashboard (query `year`, `range`, `startDate`, `endDate`). Retourne `totals`, `breakdown` par catégorie (recurring, oneTime, total).
- **POST `/api/charges`** : création.
- **PUT `/api/charges/[id]`** : mise à jour (y compris linkedSaleId, linkedService, linkedClient).
- **DELETE `/api/charges/[id]`** : suppression.

### 12.7 Dashboard

- **GET `/api/dashboard?year=...&range=...&month=...&startDate=...&endDate=...`** : KPIs (caHt, caTtc, chargesHt, resultNet, resultAfterUrssaf, averageMargin), monthlyData, serviceDistribution. Cache 5 min côté serveur. Agrégation SQL (SUM, GROUP BY) ; ventes avec `billingFrequency` mensuel démultipliées selon période.
- **GET `/api/dashboard/evolution?year=...`** : données d’évolution de l’année (monthlyEvolution, monthlyServiceEvolution, serviceAnalysis, clientAnalysis, globalKpis).

### 12.8 Paramètres et fichiers

- **GET `/api/settings`** : liste des paramètres (key/value) de l’utilisateur.
- **POST `/api/settings`** : création/mise à jour d’un paramètre `{ key, value }`.
- **POST `/api/upload-logo`** : upload logo (FormData, champ `logo`). Réponse avec chemin ou erreur.
- **DELETE `/api/upload-logo`** : suppression du logo.
- **POST `/api/reset`** : réinitialisation BDD (à usage dev/admin).

---

## 13. Composants clés

### 13.1 DataTable

- **Rôle** : tableau avec recherche, tri (colonnes sortable), pagination, virtualisation (si > 200 lignes), boutons Exporter / Importer / Créer, actions par ligne (Modifier, Supprimer, éventuellement Devis/Facture).
- **Props principales** : `data`, `columns` (key, label, render?, sortable?), `searchPlaceholder`, `emptyMessage`, `onAdd`, `onEdit`, `onDelete`, `onExport`, `virtualized`, `pageSize`.
- **Comportement** : recherche en temps réel sur toutes les colonnes ; tri au clic en-tête ; pagination avec fenêtre de pages ; si `virtualized` et `data.length > 200`, scroll virtuel (@tanstack/react-virtual). Message vide + bouton « Créer » si `onAdd` et liste vide.

### 13.2 ChargeFormModal

- Dialog formulaire charge : tous les champs (date, catégorie, fournisseur, description, montant, récurrent, type, moyen de paiement, notes, service lié, client lié). Appel `onSubmit` avec préparation des données (dates, linkedService/linkedClient à null si "none").

### 13.3 Logo

- Affichage du logo (image ou composant) utilisé en en-tête / login / register.

### 13.4 Auth Provider

- Contexte : `user`, `loading`, `login`, `logout`. Vérification session via `/api/auth/me`. Utilisé par les pages protégées et la navigation.

---

## 14. Utilitaires et lib

### 14.1 date-utils

- **Presets** : today, yesterday, thisWeek, lastWeek, thisMonth, lastMonth, thisQuarter, lastQuarter, thisYear, lastYear, ytd, last12Months, last30Days, last90Days, custom.
- **calculatePresetDates(preset)** : retourne `{ start, end, preset }`.
- **calculatePreviousPeriod(range)** : même durée, période juste avant.
- **buildApiParams(range)** : query string pour l’API dashboard (year, range, month ou startDate/endDate selon custom).

### 14.2 comparison-utils

- **calculateComparison(currentData, previousData, currentRange, previousRange)** : variations en % et tendance (up/down/stable) pour caHt, chargesHt, resultNet, resultAfterUrssaf, averageMargin. Plafond d’affichage ±300 %.
- **calculateTrendData(current, previous)** : value, percentage, trend.
- **getComparisonInsights**, **getPerformanceScore**, **getPerformanceLabel**, **getPerformanceColor** : pour analyses dérivées.

### 14.3 electron-api

- **electronFetch(path, options)** : `fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ... } })`. Utilisé partout côté client pour les API (cookie auth envoyé).
- **fetchDashboard(params)**, **fetchChargesBreakdown(params)**, **fetchDashboardEvolution(year)**, **fetchSettings()** : wrappers vers les routes correspondantes.

### 14.4 swr-fetchers

- **SWR_KEYS** : `clients`, `articles`, `sales`, `charges`, `settings`.
- **fetchClients()**, **fetchArticles()**, **fetchSales()**, **fetchCharges()**, **fetchSettings()** : appellent electronFetch et retournent les données parsées (ou lèvent si !res.ok). Utilisés avec `useSWR(SWR_KEYS.xxx, fetchXxx, { dedupingInterval: 10000, ... })`.

### 14.5 use-dashboard-data (dashboard)

- **dashboardFetcher(key)** : dérive params et year de la clé, lance en parallèle fetchDashboard, fetchChargesBreakdown, fetchDashboardEvolution, fetchSettings ; retourne `{ data, chargesData, evolutionData, companySettings }`.
- **useDashboardData(dateRange)** : clé SWR `dashboard-${params}::${year}`, options `dedupingInterval: 10000`, `keepPreviousData: true`. Retourne `{ payload, error, isLoading, isValidating, mutate }`.

### 14.6 Autres

- **csv** : `generateCSV`, `downloadCSV` pour export CSV.
- **settings** : `getDefaultTvaRate()` (lecture paramètres).
- **validations** : schémas Zod (Client, Article, Sale, Charge, etc.) et types dérivés.
- **pdf-worker-client** / **pdf.worker** : génération PDF devis/facture dans un worker.

---

## 15. Récapitulatif : quel bouton fait quoi

| Page | Bouton / Élément | Action |
|------|------------------|--------|
| Login | Se connecter | Connexion → dashboard ou message erreur / renvoyer confirmation |
| Login | Mot de passe oublié | Lien vers /forgot-password |
| Login | S'inscrire | Lien vers /register |
| Register | Créer mon compte | Inscription + email confirmation → redirection login |
| Forgot password | Envoyer | Envoi lien réinitialisation par email |
| Dashboard | Période (select) | Change la plage de dates des données |
| Dashboard | Comparaison ON/OFF | Affiche ou masque la comparaison avec période précédente |
| Dashboard | Réessayer | Relance le chargement (mutate) |
| Clients | Créer | Ouvre dialog nouveau client |
| Clients | Exporter | Télécharge CSV clients |
| Clients | ✏️ / 🗑️ | Modifier / Supprimer la ligne |
| Articles | Créer un article | Ouvre dialog nouvel article |
| Articles | ⚙️ | Ouvre dialog options du service |
| Articles | Exporter / ✏️ / 🗑️ | CSV, modifier, supprimer |
| Ventes | Nouvelle Vente | Ouvre dialog nouvelle vente |
| Ventes | Export CSV | Télécharge ventes.csv |
| Ventes | 📄 Devis / 🧾 Facture | Génère PDF devis / facture |
| Ventes | ✏️ / 🗑️ | Modifier / Supprimer la vente |
| Charges | Nouvelle Charge / Exporter | Ouvre modal charge / CSV |
| Charges | ✏️ / 🗑️ | Modifier / Supprimer la ligne |
| Paramètres | Sauvegarder (par champ) | POST settings key/value |
| Paramètres | Remplacer / Uploader / Supprimer (logo) | Upload ou suppression logo |
| Paramètres | Exporter toutes les données | GET /api/export → JSON |
| Paramètres | Importer (fichier) | POST /api/import → rechargement |
| Paramètres | Réinitialiser la base | POST /api/reset → rechargement |
| Navigation | Déconnexion | Logout → /login |

---

## 16. Récapitulatif : ce que montrent les graphiques

| Bloc | Graphique | Données affichées |
|------|-----------|-------------------|
| Dashboard | Indicateurs clés | CA HT, Charges, TVA, Résultat brut, Marge moyenne, Prélèvement URSSAF, Résultat net, Nombre de clients (avec variations % si comparaison) |
| Dashboard | Comparaison temporelle | 4 % : CA HT, Charges, Résultat net, Marge (vs période précédente) |
| Dashboard | Évolution temporelle | 2 LineCharts : CA HT, Charges HT, Résultat par mois ; puis Résultat seul par mois |
| Dashboard | Résumé des charges | Montants Récurrentes et Ponctuelles (texte) |
| Dashboard | Répartition par type (charges) | Camembert Récurrentes vs Ponctuelles |
| Dashboard | Répartition par catégorie (charges) | Camembert par catégorie (€) |
| Dashboard | Détail des catégories | Liste catégorie → total € |
| Dashboard | Répartition CA par service | Camembert part de chaque service dans le CA (période) |
| Dashboard | CA par service avec courbes | Courbes par service = CA HT par mois (année) |
| Dashboard | Cartes Services Liés | Par service : prix, nb ventes, CA, nb clients |
| Dashboard | Cartes Clients Liés | Par client : nb ventes, CA, charges, nb services |

---

*Dernière mise à jour : février 2026. Pour toute incohérence avec le code, se référer au code source.*
