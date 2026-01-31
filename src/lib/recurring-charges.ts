// Utility functions for handling recurring charges

export interface RecurringCharge {
  id: string
  expenseDate: Date
  category?: string | null
  vendor?: string | null
  description?: string | null
  amount?: number | null
  recurring?: boolean | null
  recurringType?: string | null
  costType?: string | null
  paymentMethod?: string | null
  notes?: string | null
  linkedService?: string | null
  year: number
}

export interface CalculatedCharge extends RecurringCharge {
  calculatedAmountHt: number
  calculatedAmountTtc: number
  isRecurring: boolean
  recurringPeriod: 'monthly' | 'yearly' | 'one-time'
}

/**
 * Calculate recurring charges for a given period
 * @param charges - Array of charges
 * @param year - Year to calculate for
 * @param month - Optional month (1-12) for monthly calculations
 * @returns Array of calculated charges with recurring amounts
 */
export function calculateRecurringCharges(
  charges: RecurringCharge[], 
  year: number, 
  month?: number
): CalculatedCharge[] {
  const result: CalculatedCharge[] = []
  
  charges.forEach(charge => {
    const chargeYear = new Date(charge.expenseDate).getFullYear()
    const chargeMonth = new Date(charge.expenseDate).getMonth() + 1
    
    // Determine if this charge should be included in the calculation
    let shouldInclude = false
    let recurringPeriod: 'monthly' | 'yearly' | 'one-time' = 'one-time'
    let multiplier = 1
    
    if (charge.recurring) {
      if (charge.recurringType === 'mensuel') {
        // Monthly recurring charges
        if (month && chargeYear <= year && chargeMonth <= month) {
          shouldInclude = true
          recurringPeriod = 'monthly'
          // Calculate number of months from original date to target month/year
          const monthsDiff = (year - chargeYear) * 12 + (month - chargeMonth)
          multiplier = Math.max(1, monthsDiff + 1)
        } else if (!month && chargeYear === year) {
          shouldInclude = true
          recurringPeriod = 'monthly'
          // For yearly calculation, multiply by 12 months
          multiplier = 12
        }
      } else if (charge.recurringType === 'annuel') {
        // Yearly recurring charges
        if (chargeYear <= year) {
          shouldInclude = true
          recurringPeriod = 'yearly'
          multiplier = year - chargeYear + 1
        }
      }
    } else {
      // One-time charges
      if (month && chargeYear === year && chargeMonth === month) {
        shouldInclude = true
        recurringPeriod = 'one-time'
      } else if (!month && chargeYear === year) {
        shouldInclude = true
        recurringPeriod = 'one-time'
      }
    }
    
    if (shouldInclude) {
      result.push({
        ...charge,
        calculatedAmountHt: (charge.amount || 0) * multiplier,
        calculatedAmountTtc: (charge.amount || 0) * multiplier * 1.2, // TVA 20%
        isRecurring: charge.recurring || false,
        recurringPeriod
      })
    }
  })
  
  return result
}

/**
 * Get total calculated charges for a period
 * @param charges - Array of charges
 * @param year - Year to calculate for
 * @param month - Optional month (1-12) for monthly calculations
 * @returns Object with total amounts
 */
export function getTotalCharges(
  charges: RecurringCharge[], 
  year: number, 
  month?: number
): { totalHt: number; totalTtc: number; breakdown: { recurring: number; oneTime: number } } {
  // Calculer les charges récurrentes pour l'année spécifiée
  const calculatedCharges = calculateRecurringCharges(charges, year, month)
  
  // Calculer le total des charges calculées
  const totalAmount = calculatedCharges.reduce((sum, charge) => sum + (charge.calculatedAmountHt || 0), 0)
  const totalHt = totalAmount
  const totalTtc = totalAmount
  
  const breakdown = calculatedCharges.reduce(
    (acc, charge) => {
      if (charge.recurring) {
        acc.recurring += (charge.calculatedAmountHt || 0)
      } else {
        acc.oneTime += (charge.calculatedAmountHt || 0)
      }
      return acc
    },
    { recurring: 0, oneTime: 0 }
  )
  
  return { totalHt, totalTtc, breakdown }
}

/**
 * Generate recurring charges for a specific period
 * @param recurringCharges - Array of recurring charges
 * @param startYear - Start year
 * @param endYear - End year
 * @returns Array of generated charges for the period
 */
export function generateRecurringCharges(
  recurringCharges: RecurringCharge[],
  startYear: number,
  endYear: number
): RecurringCharge[] {
  const generated: RecurringCharge[] = []
  
  recurringCharges
    .filter(charge => charge.recurring)
    .forEach(charge => {
      const originalDate = new Date(charge.expenseDate)
      const originalYear = originalDate.getFullYear()
      const originalMonth = originalDate.getMonth()
      const originalDay = originalDate.getDate()
      
      // Generate charges for each month from startYear to endYear
      for (let year = Math.max(startYear, originalYear); year <= endYear; year++) {
        const startMonth = year === originalYear ? originalMonth : 0
        const endMonth = year === endYear ? 11 : 11
        
        for (let month = startMonth; month <= endMonth; month++) {
          // Skip if this is the original charge (to avoid duplication)
          if (year === originalYear && month === originalMonth) {
            continue
          }
          
          const newDate = new Date(year, month, originalDay)
          generated.push({
            ...charge,
            id: `${charge.id}-${year}-${month}`,
            expenseDate: newDate,
            year: newDate.getFullYear(),
            recurring: false // Mark as generated, not original recurring
          })
        }
      }
    })
  
  return generated
}
