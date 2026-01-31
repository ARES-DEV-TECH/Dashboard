-- Migration : paramètres par utilisateur (clé composite userId + key).
-- Exécuter dans Supabase SQL Editor APRÈS pre-per-user-data.sql si pas déjà fait.

-- 1. Ajouter userId à parametres_entreprise s'il n'existe pas (ancienne BDD)
ALTER TABLE parametres_entreprise ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE parametres_entreprise SET "userId" = (SELECT id FROM users LIMIT 1) WHERE "userId" IS NULL;
DELETE FROM parametres_entreprise WHERE "userId" IS NULL;
ALTER TABLE parametres_entreprise ALTER COLUMN "userId" SET NOT NULL;

-- 2. Supprimer l'ancienne PK (key seul)
ALTER TABLE parametres_entreprise DROP CONSTRAINT IF EXISTS "parametres_entreprise_pkey";

-- 3. Ajouter la nouvelle PK composite (userId, key)
ALTER TABLE parametres_entreprise ADD PRIMARY KEY ("userId", "key");
