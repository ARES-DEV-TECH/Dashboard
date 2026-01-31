-- User: ajouter firstName et lastName (sans toucher à "name" si elle n'existe pas)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" TEXT;

-- Migrer et supprimer "name" uniquement si la colonne existe (ex: ancienne base)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name'
  ) THEN
    UPDATE "users" SET "firstName" = "name", "lastName" = '' WHERE "name" IS NOT NULL AND "name" != '';
    UPDATE "users" SET "firstName" = NULL, "lastName" = NULL WHERE "name" IS NULL OR "name" = '';
    ALTER TABLE "users" DROP COLUMN "name";
  END IF;
END $$;

-- Client: ajouter firstName et lastName, backfill depuis clientName
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "lastName" TEXT;

UPDATE "clients" SET
  "firstName" = TRIM(SPLIT_PART(TRIM("clientName"), ' ', 1)),
  "lastName" = CASE
    WHEN POSITION(' ' IN TRIM("clientName")) > 0
    THEN TRIM(SUBSTRING(TRIM("clientName") FROM POSITION(' ' IN TRIM("clientName")) + 1))
    ELSE ''
  END
WHERE "firstName" IS NULL OR "lastName" IS NULL;

UPDATE "clients" SET "firstName" = "clientName", "lastName" = '' WHERE "firstName" IS NULL;

ALTER TABLE "clients" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "clients" ALTER COLUMN "lastName" SET NOT NULL;
