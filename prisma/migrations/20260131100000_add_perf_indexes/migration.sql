-- Index composites pour accélérer les requêtes dashboard/evolution (userId + date/year)
CREATE INDEX IF NOT EXISTS "sales_userId_saleDate_idx" ON "sales"("userId", "saleDate");
CREATE INDEX IF NOT EXISTS "sales_userId_year_idx" ON "sales"("userId", "year");

CREATE INDEX IF NOT EXISTS "charges_userId_expenseDate_idx" ON "charges"("userId", "expenseDate");
CREATE INDEX IF NOT EXISTS "charges_userId_year_idx" ON "charges"("userId", "year");
CREATE INDEX IF NOT EXISTS "charges_userId_recurring_idx" ON "charges"("userId", "recurring");
