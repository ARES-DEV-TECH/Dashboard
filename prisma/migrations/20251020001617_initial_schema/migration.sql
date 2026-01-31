-- CreateTable
CREATE TABLE "clients" (
    "clientName" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "articles" (
    "serviceName" TEXT NOT NULL PRIMARY KEY,
    "priceHt" REAL NOT NULL,
    "tvaRate" REAL NOT NULL DEFAULT 20.00,
    "unit" TEXT,
    "type" TEXT,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "service_options" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceHt" REAL NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "service_options_serviceName_fkey" FOREIGN KEY ("serviceName") REFERENCES "articles" ("serviceName") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sales" (
    "invoiceNo" TEXT NOT NULL PRIMARY KEY,
    "saleDate" DATETIME NOT NULL,
    "clientName" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unitPriceHt" REAL NOT NULL,
    "caHt" REAL NOT NULL,
    "tvaRate" REAL NOT NULL,
    "tvaAmount" REAL NOT NULL,
    "totalTtc" REAL NOT NULL,
    "options" TEXT,
    "year" INTEGER NOT NULL,
    "quoteId" TEXT,
    "invoiceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "charges" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseDate" DATETIME NOT NULL,
    "category" TEXT,
    "vendor" TEXT,
    "description" TEXT,
    "amountTtc" REAL,
    "amountHt" REAL,
    "recurring" BOOLEAN,
    "recurringType" TEXT,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "linkedService" TEXT,
    "linkedSaleId" TEXT,
    "linkedClient" TEXT,
    "year" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "charges_linkedService_fkey" FOREIGN KEY ("linkedService") REFERENCES "articles" ("serviceName") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "charges_linkedClient_fkey" FOREIGN KEY ("linkedClient") REFERENCES "clients" ("clientName") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNo" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientAddress" TEXT,
    "quoteDate" DATETIME NOT NULL,
    "validUntil" DATETIME NOT NULL,
    "items" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalHt" REAL NOT NULL,
    "totalTva" REAL NOT NULL,
    "totalTtc" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNo" TEXT NOT NULL,
    "quoteId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientAddress" TEXT,
    "invoiceDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "items" TEXT NOT NULL,
    "notes" TEXT,
    "paymentTerms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "totalHt" REAL NOT NULL,
    "totalTva" REAL NOT NULL,
    "totalTtc" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "parametres_entreprise" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "sales_saleDate_idx" ON "sales"("saleDate");

-- CreateIndex
CREATE INDEX "sales_clientName_idx" ON "sales"("clientName");

-- CreateIndex
CREATE INDEX "sales_serviceName_idx" ON "sales"("serviceName");

-- CreateIndex
CREATE INDEX "sales_year_idx" ON "sales"("year");

-- CreateIndex
CREATE INDEX "sales_quoteId_idx" ON "sales"("quoteId");

-- CreateIndex
CREATE INDEX "sales_invoiceId_idx" ON "sales"("invoiceId");

-- CreateIndex
CREATE INDEX "sales_saleDate_year_idx" ON "sales"("saleDate", "year");

-- CreateIndex
CREATE INDEX "sales_clientName_serviceName_idx" ON "sales"("clientName", "serviceName");

-- CreateIndex
CREATE INDEX "charges_year_idx" ON "charges"("year");

-- CreateIndex
CREATE INDEX "charges_category_idx" ON "charges"("category");

-- CreateIndex
CREATE INDEX "charges_vendor_idx" ON "charges"("vendor");

-- CreateIndex
CREATE INDEX "charges_linkedService_idx" ON "charges"("linkedService");

-- CreateIndex
CREATE INDEX "charges_linkedSaleId_idx" ON "charges"("linkedSaleId");

-- CreateIndex
CREATE INDEX "charges_linkedClient_idx" ON "charges"("linkedClient");

-- CreateIndex
CREATE INDEX "charges_expenseDate_idx" ON "charges"("expenseDate");

-- CreateIndex
CREATE INDEX "charges_year_category_idx" ON "charges"("year", "category");

-- CreateIndex
CREATE INDEX "charges_expenseDate_year_idx" ON "charges"("expenseDate", "year");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quoteNo_key" ON "quotes"("quoteNo");

-- CreateIndex
CREATE INDEX "quotes_quoteNo_idx" ON "quotes"("quoteNo");

-- CreateIndex
CREATE INDEX "quotes_clientName_idx" ON "quotes"("clientName");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNo_key" ON "invoices"("invoiceNo");

-- CreateIndex
CREATE INDEX "invoices_invoiceNo_idx" ON "invoices"("invoiceNo");

-- CreateIndex
CREATE INDEX "invoices_clientName_idx" ON "invoices"("clientName");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_quoteId_idx" ON "invoices"("quoteId");
