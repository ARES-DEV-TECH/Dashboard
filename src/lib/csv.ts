import Papa from 'papaparse'
import { z } from 'zod'

// CSV parsing configuration
const csvConfig = {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header: string) => header.trim().toLowerCase(),
}

// Parse CSV file
export function parseCSV<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      ...csvConfig,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`Erreur de parsing CSV: ${results.errors[0].message}`))
        } else {
          resolve(results.data as T[])
        }
      },
      error: (error) => {
        reject(new Error(`Erreur de lecture du fichier: ${error.message}`))
      },
    })
  })
}

// Generate CSV content
export function generateCSV<T>(data: T[], headers: string[]): string {
  const csvContent = Papa.unparse(data, {
    header: true,
    columns: headers,
  })
  return csvContent
}

// Download CSV file
export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// CSV column mapping schemas
export const csvColumnMappingSchema = z.object({
  // Client columns
  clientName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  company: z.string().optional(),
  
  // Article columns
  serviceName: z.string().optional(),
  priceHt: z.string().optional(),
  tvaRate: z.string().optional(),
  billByHour: z.string().optional(),
  type: z.string().optional(),
  
  // Sale columns
  invoiceNo: z.string().optional(),
  saleDate: z.string().optional(),
  quantity: z.string().optional(),
  unitPriceHt: z.string().optional(),
  
  // Charge columns
  expenseDate: z.string().optional(),
  category: z.string().optional(),
  vendor: z.string().optional(),
  description: z.string().optional(),
  amount: z.string().optional(),
  recurring: z.string().optional(),
  costType: z.string().optional(),
  paymentMethod: z.string().optional(),
  notes: z.string().optional(),
  linkedService: z.string().optional(),
})

export type CSVColumnMapping = z.infer<typeof csvColumnMappingSchema>

// Detect CSV columns automatically
export function detectCSVColumns(headers: string[]): CSVColumnMapping {
  const mapping: CSVColumnMapping = {}
  
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase().trim()
    
    // Client mappings
    if (lowerHeader.includes('client') || lowerHeader.includes('nom')) {
      mapping.clientName = header
    } else if (lowerHeader.includes('email') || lowerHeader.includes('mail')) {
      mapping.email = header
    } else if (lowerHeader.includes('phone') || lowerHeader.includes('telephone') || lowerHeader.includes('tel')) {
      mapping.phone = header
    } else if (lowerHeader.includes('website') || lowerHeader.includes('site')) {
      mapping.website = header
    } else if (lowerHeader.includes('company') || lowerHeader.includes('entreprise')) {
      mapping.company = header
    }
    
    // Article mappings
    else if (lowerHeader.includes('service') || lowerHeader.includes('article')) {
      mapping.serviceName = header
    } else if (lowerHeader.includes('prix') || lowerHeader.includes('price')) {
      mapping.priceHt = header
    } else if (lowerHeader.includes('tva') || lowerHeader.includes('tax')) {
      mapping.tvaRate = header
    } else if (lowerHeader.includes('facturer') || lowerHeader.includes('heure') || lowerHeader.includes('billbyhour')) {
      mapping.billByHour = header
    } else if (lowerHeader.includes('type')) {
      mapping.type = header
    }
    
    // Sale mappings
    else if (lowerHeader.includes('facture') || lowerHeader.includes('invoice')) {
      mapping.invoiceNo = header
    } else if (lowerHeader.includes('date') && lowerHeader.includes('vente')) {
      mapping.saleDate = header
    } else if (lowerHeader.includes('quantite') || lowerHeader.includes('quantity')) {
      mapping.quantity = header
    } else if (lowerHeader.includes('prix') && lowerHeader.includes('unitaire')) {
      mapping.unitPriceHt = header
    }
    
    // Charge mappings
    else if (lowerHeader.includes('date') && lowerHeader.includes('charge')) {
      mapping.expenseDate = header
    } else if (lowerHeader.includes('categorie') || lowerHeader.includes('category')) {
      mapping.category = header
    } else if (lowerHeader.includes('vendor') || lowerHeader.includes('fournisseur')) {
      mapping.vendor = header
    } else if (lowerHeader.includes('description') || lowerHeader.includes('desc')) {
      mapping.description = header
    } else if (lowerHeader.includes('montant') && lowerHeader.includes('ttc')) {
      mapping.amount = header
    } else if (lowerHeader.includes('recurring') || lowerHeader.includes('recurrent')) {
      mapping.recurring = header
    } else if (lowerHeader.includes('cost') && lowerHeader.includes('type')) {
      mapping.costType = header
    } else if (lowerHeader.includes('payment') || lowerHeader.includes('paiement')) {
      mapping.paymentMethod = header
    } else if (lowerHeader.includes('notes') || lowerHeader.includes('note')) {
      mapping.notes = header
    } else if (lowerHeader.includes('linked') || lowerHeader.includes('lie')) {
      mapping.linkedService = header
    }
  })
  
  return mapping
}

// Transform CSV data to application format
export function transformCSVData<T>(
  csvData: Record<string, unknown>[],
  mapping: CSVColumnMapping,
  transformFn: (row: Record<string, unknown>) => T
): T[] {
  return csvData.map(row => {
    const transformedRow: Record<string, unknown> = {}
    
    // Map CSV columns to application fields
    Object.entries(mapping).forEach(([appField, csvColumn]) => {
      if (csvColumn && row[csvColumn] !== undefined) {
        transformedRow[appField] = row[csvColumn]
      }
    })
    
    return transformFn(transformedRow)
  })
}

// Validate CSV data
export function validateCSVData<T>(
  data: T[],
  schema: z.ZodSchema<T>
): { valid: T[]; errors: string[] } {
  const valid: T[] = []
  const errors: string[] = []
  
  data.forEach((item, index) => {
    const result = schema.safeParse(item)
    if (result.success) {
      valid.push(result.data)
    } else {
      errors.push(`Ligne ${index + 1}: ${result.error.issues.map(e => e.message).join(', ')}`)
    }
  })
  
  return { valid, errors }
}
