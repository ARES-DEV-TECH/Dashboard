# Roadmap ARES Dashboard

Priorités et prochaines évolutions du projet.

---

## Comment lire cette roadmap

Pour chaque priorité à faire, la roadmap précise :

- **Ce qu’on veut** : objectif métier ou utilisateur.
- **Résultat attendu** : ce que l’utilisateur voit ou obtient à la fin (écrans, comportements, messages).
- **Composants et technique** : quels composants UI (boutons, modales, champs), quelles API ou pages, quel modèle de données si besoin.

---

## Vue d’ensemble

| Bloc | Statut | Prochaine action |
|------|--------|------------------|
| **Responsive Mobile** | 🔴 **CRITIQUE** | Refonte complète (Navigation, Tableaux en Cartes, Formulaires 1 col) |
| **Bugs / corrections** | ✅ Tous traités | — |
| **Stabilité** (toasts, Sentry, rate limiting) | ✅ Fait | — |
| **UI / UX** (Design Glass, Forms, Tables) | ✅ Fait | Harmonisation terminée |
| **Analytics** (Clients, Revenus) | ✅ Fait | Top Clients, Répartition Revenus, Info-bulles |
| **Tests E2E** (Auth, Sales Flow) | ✅ Fait | Scénarios critiques couverts |
| **Performance perçue** (SWR, prefetch) | ✅ Fait | — |
| **Envoi d’emails** | ✅ Fait | Resend + SMTP |
| **Devis / factures / paiements** | ⬜ À faire | Nomenclatures personnalisables, paiement en plusieurs fois |
| **Connexion Google** | ⬜ À faire | Login via OAuth 2.0 |
| **Calendrier / Agenda Google** | ⬜ À faire | Sync agenda Google |

---

## ✅ Déjà fait (Récent)

### UI & UX (Février 2026)
- **Refonte UI Globale** : Design "Glass" sur les KPIs, Tableaux "Pro" (Header uppercase, Zebra striping), Actions avec Tooltips.
- **Formulaires** : Passage en grille 2 colonnes avec regroupement visuel (Fieldsets) pour Ventes, Clients, Articles, Charges.
- **Analytics Enrichi** : Ajout section "Clients & Revenus" (Top 5 Clients, Répartition Récurrent/Ponctuel), Info-bulles sur les KPIs.
- **Gestion Erreurs** : Pages `error.tsx` stylisées pour Dashboard, Ventes, Clients.

### Qualité & Tests
- **Tests E2E** : Scénario complet (Client -> Article -> Vente -> Dashboard) validé.
- **Seed** : Script de seed corrigé et robuste.

---

## Priorité 0 (CRITIQUE) – Responsive Mobile

**Objectif** : L'application doit être parfaitement utilisable sur mobile (iPhone/Android). Actuellement, l'expérience est dégradée sur petits écrans.

**Problèmes identifiés** :
- **Tableaux** : Scroll horizontal pénible, colonnes tronquées.
- **Formulaires** : Modals trop larges, grille 2 colonnes inadaptée, scroll difficile.
- **Graphiques** : Illisibles ou écrasés sur mobile.
- **Navigation** : Sidebar mobile parfois capricieuse.

**Plan d'action** :
1.  **Navigation Mobile** :
    *   Vérifier le comportement du Sheet/Drawer menu.
    *   S'assurer que tous les liens sont accessibles au pouce.
2.  **Tableaux (Listes)** :
    *   **Transformation en "Cartes"** sur mobile (`hidden md:table-row` pour le tableau, `block md:hidden` pour une vue liste de cartes).
    *   Afficher uniquement les infos clés (Nom, Statut, Montant) et le menu d'actions.
3.  **Formulaires** :
    *   Forcer `grid-cols-1` sur mobile.
    *   Utiliser des `Drawer` (Tiroir bas) au lieu de `Dialog` (Modal centre) sur mobile pour une meilleure ergonomie (pattern natif iOS/Android).
4.  **Dashboard / Analytics** :
    *   Passer les grilles de KPIs en 1 colonne (`grid-cols-1`).
    *   Ajuster la hauteur des graphiques Recharts.
    *   Masquer les légendes trop verbeuses ou les passer en dessous.

---

## Priorité 1 – Devis, factures et paiements

### 1.1 Nomenclature devis / facture
**Ce qu’on veut** : Personnaliser les libellés et le format des numéros (ex. F2026-001).
**Technique** : Champs dans `/settings`, stockage dans `ParametresEntreprise`.

### 1.2 Paiement en plusieurs fois / acomptes
**Ce qu’on veut** : Gérer les acomptes sur devis et le suivi des règlements partiels.
**Technique** : Table `Payment`, UI "Enregistrer un paiement", calcul du "Reste dû".

---

## Priorité 2 – Connexion Google (Auth)

**Ce qu’on veut** : "Se connecter avec Google" pour réduire la friction.
**Technique** : OAuth 2.0, API route `/api/auth/google`, liaison de compte par email.

---

## Priorité 3 – Calendrier et agenda Google

**Ce qu’on veut** : Vue calendrier intégrée et synchro (lecture) avec Google Calendar.
**Technique** : Page `/calendar`, lib `react-day-picker` ou `fullcalendar`, API Google Calendar.

---

## Checklist de Production (Rappel)

- [ ] **Sentry** : Vérifier la remontée des erreurs en prod.
- [ ] **Rate Limiting** : Passer sur Redis (Vercel KV) pour le multi-instance.
- [ ] **Backups** : Vérifier la politique de backup Supabase.

---

*Dernière mise à jour : Février 2026 - Focus Mobile First.*
