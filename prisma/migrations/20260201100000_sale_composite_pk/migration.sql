-- Sale: clé primaire composite (userId, invoiceNo) pour permettre le même numéro de facture par utilisateur
-- Supprimer l'ancienne PK sur invoiceNo puis créer la nouvelle PK composite
ALTER TABLE "sales" DROP CONSTRAINT IF EXISTS "sales_pkey";
ALTER TABLE "sales" ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("userId", "invoiceNo");
