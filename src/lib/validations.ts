import { z } from 'zod'

// Client validations (clientName dérivé de firstName + " " + lastName côté API)
export const clientSchema = z.object({
  clientName: z.string().min(1).optional(), // envoyé en lecture, calculé en écriture
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')).or(z.null()),
  phone: z.string().optional(),
  website: z.string().optional(),
  company: z.string().optional(),
})

export const createClientSchema = clientSchema.omit({ clientName: true })
export const updateClientSchema = clientSchema.omit({ clientName: true })

// Article validations
export const articleSchema = z.object({
  serviceName: z.string().min(1, 'Le nom du service est requis'),
  priceHt: z.number().positive('Le prix doit être strictement positif'),
  billByHour: z.boolean().optional(),
  billingFrequency: z.enum(['annuel', 'mensuel', 'ponctuel']).optional().nullable(),
  type: z.enum(['service', 'produit']).optional(),
  description: z.string().optional().nullable(),
})

export const createArticleSchema = articleSchema
export const updateArticleSchema = articleSchema

// Sale validations
export const saleSchema = z.object({
  invoiceNo: z.string().min(1, 'Le numéro de facture est requis'),
  saleDate: z.string().min(1, 'La date de vente est requise'),
  clientName: z.string().min(1, 'Le client est requis'),
  serviceName: z.string().min(1, 'Le service est requis'),
  quantity: z.number().positive('La quantité doit être strictement positive'),
  unitPriceHt: z.number().positive('Le prix unitaire doit être strictement positif'),
  unitLabel: z.string().optional(), // "heure" | "forfait" pour affichage PDF
  options: z.string().optional(), // JSON des options sélectionnées
  caHt: z.number().min(0, 'Le CA HT doit être positif'),
  tvaAmount: z.number().min(0, 'Le montant TVA doit être positif'),
  totalTtc: z.number().min(0, 'Le total TTC doit être positif'),
  year: z.number().int().min(2020).max(2030),
})

// Création : invoiceNo optionnel (généré côté API si vide). Si fourni : lettres, chiffres et tirets uniquement.
export const createSaleSchema = saleSchema.omit({ caHt: true, tvaAmount: true, totalTtc: true, year: true }).extend({
  invoiceNo: z
    .string()
    .max(50, 'Numéro de facture trop long')
    .regex(/^[A-Za-z0-9\-]*$/, 'Uniquement lettres, chiffres et tirets (pas de caractères spéciaux)')
    .optional()
    .or(z.literal('')),
  options: z.string().optional(),
})
// PUT : le front n'envoie pas caHt/tvaAmount/totalTtc/year, recalculés côté API
export const updateSaleSchema = saleSchema.omit({ caHt: true, tvaAmount: true, totalTtc: true, year: true }).extend({
  saleDate: z.string().min(1, 'La date de vente est requise'),
  options: z.string().optional(),
})

// Charge validations
export const chargeSchema = z.object({
  id: z.string().optional(),
  expenseDate: z.date(),
  category: z.string().optional(),
  vendor: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().min(0, 'Le montant doit être positif').optional(),
  recurring: z.boolean().optional(),
  recurringType: z.enum(['mensuel', 'annuel', 'ponctuel']).optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().nullable().optional(),
  linkedService: z.string().nullable().optional(),
  linkedSaleId: z.string().nullable().optional(),
  linkedClient: z.string().nullable().optional(), // Ajout du champ client
  year: z.number().int().min(2020).max(2030),
})

export const createChargeSchema = chargeSchema.omit({ id: true })
export const updateChargeSchema = chargeSchema

// Quote validations
export const quoteItemSchema = z.object({
  serviceName: z.string().min(1, 'Le nom du service est requis'),
  description: z.string().optional(),
  quantity: z.number().positive('La quantité doit être strictement positive'),
  unitPriceHt: z.number().positive('Le prix unitaire doit être strictement positif'),
})

export const quoteSchema = z.object({
  id: z.string().optional(),
  quoteNo: z.string().optional(),
  clientName: z.string().min(1, 'Le client est requis'),
  clientEmail: z.string().email('Email invalide').optional().or(z.literal('')).or(z.null()),
  clientAddress: z.string().optional(),
  quoteDate: z.string().min(1, 'La date du devis est requise'),
  validUntil: z.string().min(1, 'La date de validité est requise'),
  items: z.array(quoteItemSchema).min(1, 'Au moins un article est requis'),
  notes: z.string().optional(),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).default('draft'),
  totalHt: z.number().min(0),
  totalTva: z.number().min(0),
  totalTtc: z.number().min(0),
})

export const createQuoteSchema = quoteSchema.omit({ id: true, quoteNo: true, totalHt: true, totalTva: true, totalTtc: true })
export const updateQuoteSchema = quoteSchema.omit({ id: true, quoteNo: true })

// Service Option validations
export const serviceOptionSchema = z.object({
  serviceName: z.string().min(1, 'Le nom du service est requis'),
  name: z.string().min(1, 'Le nom de l\'option est requis'),
  description: z.string().optional(),
  priceHt: z.number().positive('Le prix doit être strictement positif'),
  isDefault: z.boolean().default(false),
})

// Parameter validations
export const parameterSchema = z.object({
  key: z.string().min(1, 'La clé est requise'),
  value: z.string(),
})

// CSV Import validations
export const csvImportSchema = z.object({
  file: z.instanceof(File),
  type: z.enum(['clients', 'articles', 'sales', 'charges']),
  mapping: z.record(z.string(), z.string()),
})

// Dashboard filters
export const dashboardFiltersSchema = z.object({
  year: z.number().int().min(2020).max(2030),
  search: z.string().optional(),
})

// Performance filters
export const performanceFiltersSchema = z.object({
  year: z.number().int().min(2020).max(2030),
})

export type Client = z.infer<typeof clientSchema>
export type Article = z.infer<typeof articleSchema>
export type Sale = z.infer<typeof saleSchema>
export type Charge = z.infer<typeof chargeSchema>
export type QuoteItem = z.infer<typeof quoteItemSchema>
export type Quote = z.infer<typeof quoteSchema>

// Invoice validations
export const invoiceItemSchema = z.object({
  serviceName: z.string().min(1, 'Le nom du service est requis'),
  description: z.string().optional(),
  quantity: z.number().positive('La quantité doit être strictement positive'),
  unitPriceHt: z.number().positive('Le prix doit être strictement positif'),
})

export const invoiceSchema = z.object({
  id: z.string().optional(),
  invoiceNo: z.string().optional(),
  clientName: z.string().min(1, 'Le nom du client est requis'),
  clientEmail: z.string().email('Email invalide').optional().or(z.literal('')).or(z.null()),
  clientAddress: z.string().optional(),
  invoiceDate: z.string().min(1, 'La date de facture est requise'),
  dueDate: z.string().min(1, 'La date d\'échéance est requise'),
  status: z.enum(['draft', 'sent', 'paid', 'overdue']).default('draft'),
  items: z.array(invoiceItemSchema).min(1, 'Au moins un article est requis'),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  totalHt: z.number().optional(),
  totalTva: z.number().optional(),
  totalTtc: z.number().optional(),
})

export const createInvoiceSchema = invoiceSchema.omit({ id: true, invoiceNo: true })
export const updateInvoiceSchema = invoiceSchema.omit({ id: true, invoiceNo: true })

export type InvoiceItem = z.infer<typeof invoiceItemSchema>
export type Invoice = z.infer<typeof invoiceSchema>
export type Parameter = z.infer<typeof parameterSchema>
export type DashboardFilters = z.infer<typeof dashboardFiltersSchema>
export type PerformanceFilters = z.infer<typeof performanceFiltersSchema>
