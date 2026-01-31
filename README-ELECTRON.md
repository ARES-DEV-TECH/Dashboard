# ARES Dashboard - Application Electron

## 🚀 Installation et Utilisation

### Prérequis
- Node.js 18+ 
- npm ou yarn
- PostgreSQL (base de données externe)

### Installation des dépendances
```bash
npm install
```

### Configuration de la base de données
1. Configurez votre connexion PostgreSQL dans `.env`
2. Exécutez les migrations :
```bash
npm run db:push
```

### Développement
```bash
# Démarrer l'application en mode développement
npm run electron:dev
```

### Build et Distribution

#### Build de l'application
```bash
# Construire l'application
npm run electron:build
```

#### Créer les packages pour Mac
```bash
# Créer les packages DMG et ZIP pour Mac (Intel + Apple Silicon)
npm run electron:dist-mac
```

Les fichiers de distribution seront créés dans le dossier `dist-electron/` :
- `ARES Dashboard-0.1.0.dmg` (Intel Mac)
- `ARES Dashboard-0.1.0-arm64.dmg` (Apple Silicon Mac)
- `ARES Dashboard-0.1.0-mac.zip` (Intel Mac - ZIP)
- `ARES Dashboard-0.1.0-arm64-mac.zip` (Apple Silicon Mac - ZIP)

## 📦 Structure de l'Application

### Architecture
- **Frontend** : Next.js 15 avec React 19
- **Backend** : API Routes Next.js
- **Base de données** : PostgreSQL (externe)
- **Desktop** : Electron 38

### Fichiers principaux
- `electron/main.js` - Processus principal Electron
- `electron-builder.json` - Configuration du packaging
- `next.config.ts` - Configuration Next.js pour Electron
- `package.json` - Scripts et dépendances

## 🔧 Configuration

### Variables d'environnement
```env
DATABASE_URL="postgresql://user:password@host:port/database"
NEXTAUTH_SECRET="your-secret"
```

### Configuration Electron
- **Fenêtre** : 1400x900 (minimum 1200x700)
- **Sécurité** : Context isolation activé
- **Menu** : Menu natif macOS avec raccourcis

## 🚀 Déploiement

### Pour les utilisateurs finaux
1. Téléchargez le fichier DMG approprié pour votre Mac
2. Montez le DMG et glissez l'application dans Applications
3. Lancez l'application depuis le Launchpad ou Applications

### Notes importantes
- L'application nécessite une connexion Internet pour accéder à la base de données PostgreSQL
- Les données sont stockées sur le serveur externe, pas localement
- L'application démarre automatiquement un serveur Next.js en arrière-plan

## 🛠️ Développement

### Scripts disponibles
- `npm run electron:dev` - Développement avec hot reload
- `npm run electron:build` - Build de production
- `npm run electron:dist-mac` - Création des packages Mac
- `npm run electron:pack` - Package simple
- `npm run electron:dist` - Distribution complète

### Debugging
- Les DevTools sont automatiquement ouverts en mode développement
- Utilisez `Cmd+Option+I` pour ouvrir les DevTools en production

## 📱 Fonctionnalités

### Dashboard
- KPIs en temps réel
- Graphiques et visualisations
- Filtres par date avancés
- Comparaisons temporelles

### Gestion
- **Clients** : CRUD complet
- **Articles** : Services et options
- **Ventes** : Facturation et devis
- **Charges** : Dépenses et récurrence
- **Paramètres** : Configuration entreprise

### Rapports
- Export PDF des factures
- Export CSV des données
- Génération de devis
- Suivi des performances

## 🔒 Sécurité

- Connexion sécurisée à la base de données
- Validation des données avec Zod
- Gestion des erreurs robuste
- Cache optimisé pour les performances

## 📞 Support

Pour toute question ou problème :
1. Vérifiez la connexion à la base de données
2. Consultez les logs dans la console
3. Redémarrez l'application si nécessaire

---

**ARES Dashboard** - Application de gestion d'entreprise
Version 0.1.0 - Compatible macOS (Intel + Apple Silicon)