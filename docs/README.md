# Documentation ARES Dashboard

## Contenu

| Fichier | Description |
|---------|-------------|
| **MIGRATION-PER-USER-DATA.md** | Migration des données par utilisateur : clients, articles, ventes, charges, paramètres. Scripts SQL à exécuter sur une base existante (Supabase / PostgreSQL). |

## Migrations Prisma

Les migrations officielles Prisma sont dans `prisma/migrations/` (dossiers datés + `migration.sql`). Les scripts `pre-per-user-*.sql` sont des migrations manuelles pour une base déjà en production avant l’isolation par utilisateur.

## Roadmap

Voir **ROADMAP.md** à la racine du projet pour les priorités et étapes validées.
