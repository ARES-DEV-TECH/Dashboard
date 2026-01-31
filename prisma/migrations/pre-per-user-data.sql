-- Migration manuelle : données par utilisateur (clés composites).
-- Exécuter dans Supabase SQL Editor (ou psql) sur votre base PostgreSQL.
-- Ordre : ajouter userId aux tables qui n'en ont pas, puis FKs, PKs, puis recréer les FKs.

-- 0. Ajouter userId à articles et clients s'ils ne l'ont pas (ancienne BDD), et remplir avec le 1er user
ALTER TABLE articles ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE articles SET "userId" = (SELECT id FROM users LIMIT 1) WHERE "userId" IS NULL;
ALTER TABLE articles ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE clients SET "userId" = (SELECT id FROM users LIMIT 1) WHERE "userId" IS NULL;
ALTER TABLE clients ALTER COLUMN "userId" SET NOT NULL;

-- 1. Ventes : attribuer un userId aux lignes qui n'en ont pas
UPDATE sales SET "userId" = (SELECT id FROM users LIMIT 1) WHERE "userId" IS NULL;
ALTER TABLE sales ALTER COLUMN "userId" SET NOT NULL;

-- 2. service_options : ajouter userId et remplir depuis l'article lié
ALTER TABLE service_options ADD COLUMN IF NOT EXISTS "userId" TEXT;
UPDATE service_options so
SET "userId" = (SELECT a."userId" FROM articles a WHERE a."serviceName" = so."serviceName" LIMIT 1);
DELETE FROM service_options WHERE "userId" IS NULL;
ALTER TABLE service_options ALTER COLUMN "userId" SET NOT NULL;

-- 3. Supprimer TOUTES les FKs qui dépendent de clients_pkey et articles_pkey (AVANT de modifier les PK)
--    (y compris celles ajoutées par un run précédent, pour que le script soit réexécutable)
ALTER TABLE charges DROP CONSTRAINT IF EXISTS "charges_linkedService_fkey";
ALTER TABLE charges DROP CONSTRAINT IF EXISTS "charges_linkedClient_fkey";
ALTER TABLE service_options DROP CONSTRAINT IF EXISTS "service_options_serviceName_fkey";
ALTER TABLE service_options DROP CONSTRAINT IF EXISTS "service_options_userId_serviceName_fkey";

-- 4. clients : passer en clé primaire composite (userId, clientName)
ALTER TABLE clients DROP CONSTRAINT IF EXISTS "clients_pkey";
ALTER TABLE clients ADD PRIMARY KEY ("userId", "clientName");

-- 5. articles : passer en clé primaire composite (userId, serviceName)
ALTER TABLE articles DROP CONSTRAINT IF EXISTS "articles_pkey";
ALTER TABLE articles ADD PRIMARY KEY ("userId", "serviceName");

-- 6. Recréer les FKs composites sur charges
ALTER TABLE charges ADD CONSTRAINT "charges_linkedService_fkey"
  FOREIGN KEY ("userId", "linkedService") REFERENCES articles("userId", "serviceName") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE charges ADD CONSTRAINT "charges_linkedClient_fkey"
  FOREIGN KEY ("userId", "linkedClient") REFERENCES clients("userId", "clientName") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Recréer la FK composite sur service_options vers articles
ALTER TABLE service_options ADD CONSTRAINT "service_options_userId_serviceName_fkey"
  FOREIGN KEY ("userId", "serviceName") REFERENCES articles("userId", "serviceName") ON DELETE CASCADE ON UPDATE CASCADE;
