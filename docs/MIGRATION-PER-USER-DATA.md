# Migration : données par utilisateur

Les clients, articles, ventes, charges et options de service sont désormais **isolés par utilisateur** : chaque utilisateur ne voit et ne modifie que ses propres données.

## Modifications du schéma

- **Client** : clé primaire composite `(userId, clientName)` — deux utilisateurs peuvent avoir un client avec le même nom.
- **Article** : clé primaire composite `(userId, serviceName)` — idem pour les services/articles.
- **ServiceOption** : champ `userId` ajouté, liaison à l’article par `(userId, serviceName)`.
- **Sale** : `userId` obligatoire (plus de `null`).
- **Charge** : FKs vers Client et Article en composite `(userId, clientName)` / `(userId, serviceName)`.

## Appliquer la migration (PostgreSQL / Supabase)

1. **Sauvegarder la base** (recommandé).

2. **Exécuter les scripts SQL** dans l’éditeur SQL Supabase (ou avec `psql`), **dans cet ordre** :
   - `prisma/migrations/pre-per-user-data.sql` (clients, articles, ventes, charges, service_options)
   - `prisma/migrations/pre-per-user-parametres.sql` (parametres_entreprise : clé composite `userId` + `key`)

3. Si une contrainte n’existe pas (nom différent), vous pouvez ignorer l’erreur `DROP CONSTRAINT IF EXISTS` ou adapter le nom. Pour lister les contraintes :
   ```sql
   SELECT conname FROM pg_constraint WHERE conrelid = 'charges'::regclass;
   ```

4. **Régénérer le client Prisma** (déjà fait si le schéma est à jour) :
   ```bash
   npx prisma generate
   ```

Après la migration, chaque utilisateur ne verra que ses clients, articles, ventes et charges ; les suppressions et créations sont bien limitées à son compte.
