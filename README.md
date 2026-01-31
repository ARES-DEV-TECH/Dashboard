# ARES Dashboard - Pilotage d'entreprise

Application web de pilotage d'entreprise pour ARES, remplaçant le fichier Excel V4 "no codes". L'application couvre la gestion complète des clients, services, ventes, charges professionnelles, performances par service, et fournit des vues graphiques et agrégations.

## 🚀 Fonctionnalités

### 📊 Dashboard
- **KPIs en temps réel** : CA HT, CA TTC, Charges HT, Résultat Net, Net Après URSSAF, Marge moyenne
- **Graphiques dynamiques** : Évolution du CA par mois, Répartition par service
- **Top Services** : Classement des services par CA avec marges
- **Filtrage par année** avec sélecteur intuitif

### 👥 Gestion des Clients
- CRUD complet (Créer, Lire, Modifier, Supprimer)
- Recherche et tri
- Export/Import CSV
- Validation des données

### 📦 Gestion des Articles
- Services et produits avec prix HT, TVA, unité
- Duplication d'articles
- Export/Import CSV
- Types : Service ou Produit

### 💰 Gestion des Ventes
- Création avec calculs automatiques (CA HT, TVA, TTC)
- Génération automatique des numéros de facture
- Sélection client/service avec autocomplétion
- Export/Import CSV avec mapping des colonnes

### 💳 Gestion des Charges
- Charges professionnelles avec catégorisation
- Liaison optionnelle aux services
- Types : Fixe ou Variable
- Export/Import CSV

### 📈 Performances
- Analyse par service avec KPIs détaillés
- Graphiques de répartition et marges
- Filtrage par année

### ⚙️ Paramètres
- Configuration des taux (URSSAF, TVA)
- Gestion des backups
- Export JSON global et SQL DDL

## 🛠️ Stack Technique

- **Framework** : Next.js 14 (App Router) + TypeScript
- **UI** : TailwindCSS + shadcn/ui + lucide-react
- **Graphiques** : Recharts
- **Base de données** : SQLite (dev) + Prisma ORM
- **Validation** : Zod
- **Import/Export** : PapaParse (CSV)
- **Tests** : Vitest + Playwright

## 📦 Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Installation
```bash
# Cloner le projet
git clone <repository-url>
cd ares-dashboard

# Installer les dépendances
npm install

# Configurer la base de données
cp .env.example .env

# Générer le client Prisma
npx prisma generate

# Créer et peupler la base de données
npx prisma db push
npm run db:seed
```

## 🚀 Commandes

### Développement
```bash
# Démarrer le serveur de développement
npm run dev

# Ouvrir Prisma Studio
npm run db:studio

# Synchroniser le schéma de base de données
npm run db:push
```

### Production
```bash
# Construire l'application
npm run build

# Démarrer en production
npm run start
```

### Tests
```bash
# Tests unitaires
npm run test

# Tests E2E
npm run test:e2e

# Tests avec couverture
npm run test:coverage
```

### Base de données
```bash
# Réinitialiser la base (schéma + seed)
npm run db:reset

# Créer les paramètres entreprise par défaut
npm run db:seed

# Ouvrir Prisma Studio
npx prisma studio
```

## 📁 Structure du Projet

```
ares-dashboard/
├── src/
│   ├── app/                    # App Router (Next.js 14)
│   │   ├── dashboard/          # Page dashboard
│   │   ├── clients/            # Gestion des clients
│   │   ├── articles/           # Gestion des articles
│   │   ├── sales/              # Gestion des ventes
│   │   ├── charges/            # Gestion des charges
│   │   ├── performances/       # Analyse des performances
│   │   ├── settings/           # Paramètres
│   │   └── api/                # API Routes
│   ├── components/             # Composants React
│   │   ├── ui/                 # Composants UI (shadcn/ui)
│   │   └── navigation.tsx      # Navigation principale
│   └── lib/                    # Utilitaires
│       ├── db.ts               # Client Prisma
│       ├── validations.ts      # Schémas Zod
│       ├── math.ts             # Calculs métier
│       └── csv.ts              # Import/Export CSV
├── prisma/
│   ├── schema.prisma           # Schéma de base de données
│   └── seed-realistic.ts       # Paramètres entreprise par défaut (npm run db:seed)
├── tests/                      # Tests
│   ├── unit/                   # Tests unitaires
│   └── e2e/                    # Tests E2E
└── public/                     # Assets statiques
```

## 🗄️ Modèle de Données

### Tables Principales
- **Client** : Informations clients (nom, email, téléphone, adresse)
- **Article** : Services/produits (nom, prix HT, TVA, unité, type)
- **Sale** : Ventes (facture, date, client, service, quantité, prix, calculs)
- **Charge** : Charges professionnelles (date, catégorie, fournisseur, montant, service lié)
- **ParametresEntreprise** : Configuration (taux URSSAF, mentions, etc.)

### Relations
- Sale → Client (clientName)
- Sale → Article (serviceName)
- Charge → Article (linkedService, optionnel)

## 🧮 Calculs Métier

### Ventes
- `caHt = quantity × unitPriceHt`
- `tvaAmount = caHt × (tvaRate / 100)`
- `totalTtc = caHt + tvaAmount`
- `year = EXTRACT(YEAR FROM saleDate)`

### Dashboard (par année)
- `CA_HT_Année = SUM(Sale.caHt WHERE year=Y)`
- `CA_TTC_Année = SUM(Sale.totalTtc WHERE year=Y)`
- `Charges_HT_Année = SUM(Charge.amountHt WHERE year=Y)`
- `Résultat_Net_HT = CA_HT_Année - Charges_HT_Année`
- `Net_Dispo_Après_URSSAF = Résultat_Net_HT - (CA_HT_Année × tauxUrssaf)`

### Performances par Service
- `qty_sold = SUM(Sale.quantity WHERE year=Y AND serviceName=s)`
- `ca_ht = SUM(Sale.caHt WHERE year=Y AND serviceName=s)`
- `charges_ht_linked = SUM(Charge.amountHt WHERE year=Y AND linkedService=s)`
- `result_net = ca_ht - charges_ht_linked`
- `margin_pct = IF ca_ht>0 THEN result_net/ca_ht×100 ELSE 0`

## 📥 Import/Export

### Import CSV
- **Mapping automatique** des colonnes
- **Validation** des données avec Zod
- **Preview** avant import
- **Gestion des erreurs** détaillée

### Export
- **CSV** : Toutes les listes
- **JSON** : Export global complet
- **SQL DDL** : Schéma de base de données

## 🧪 Tests

### Tests Unitaires
- Calculs métier (math.ts)
- Parsers CSV (csv.ts)
- Validations Zod (validations.ts)

### Tests E2E
- Création client/article/vente/charge
- Vérification des KPIs et graphiques
- Import CSV et validation des totaux

## 🎨 UI/UX

### Design
- **Interface sobre et professionnelle** (shadcn/ui + Tailwind)
- **Couleurs** : Blancs et gris doux avec arrondis
- **Navigation** : Menu horizontal avec icônes
- **Responsive** : Adapté mobile et desktop

### Composants
- **DataTable** : Table avec recherche, tri, pagination
- **KpiCard** : Cartes de métriques avec tendances
- **YearPicker** : Sélecteur d'année avec URL sync
- **Charts** : Graphiques Recharts intégrés

## 🔐 Sécurité

- **Validation** côté client et serveur (Zod)
- **Sanitisation** des entrées utilisateur
- **Contraintes** d'unicité en base
- **Gestion d'erreurs** robuste

## 🚀 Déploiement

### Variables d'Environnement
```env
DATABASE_URL="file:./dev.db"  # SQLite local
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### Production
- **Base de données** : PostgreSQL recommandé
- **Hébergement** : Vercel, Netlify, ou serveur dédié
- **CDN** : Pour les assets statiques

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
1. Vérifier la documentation
2. Consulter les issues existantes
3. Créer une nouvelle issue avec les détails

---

**ARES Dashboard** - Pilotage d'entreprise moderne et efficace 🚀
