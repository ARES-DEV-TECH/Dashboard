-- Ajout de la colonne emailVerifiedAt pour la confirmation d'email à l'inscription
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- Utilisateurs existants : considérés comme déjà vérifiés (compatibilité)
UPDATE "users" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL;
