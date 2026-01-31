// Utility functions for calculations

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear()
  const timestamp = Date.now().toString().slice(-6)
  return `F${year}-${timestamp}`
}

/**
 * Calcule les montants d'une vente (CA HT, TVA, TTC).
 * Si tvaRate est fourni (côté serveur), on l'utilise ; sinon on charge les paramètres (côté client).
 */
export async function calculateSaleAmounts(quantity: number, unitPriceHt: number, optionsTotal: number = 0, tvaRate?: number) {
  let rate = tvaRate
  if (rate == null) {
    const { getCompanySettings } = await import('./settings')
    const companySettings = await getCompanySettings()
    rate = companySettings.defaultTvaRate ?? 20
  }

  const baseCaHt = quantity * unitPriceHt
  const caHt = baseCaHt + optionsTotal
  const tvaAmount = caHt * (rate / 100)
  const totalTtc = caHt + tvaAmount
  const year = new Date().getFullYear()

  return {
    caHt,
    tvaAmount,
    totalTtc,
    year
  }
}


export function calculateDashboardKPIs(sales: Array<{year: number, caHt: number, totalTtc: number}>, charges: Array<{expenseDate: Date, amount: number | null}>, tauxUrssaf: number = 22, targetYear?: number) {
  // Pour les périodes personnalisées, utiliser toutes les ventes et charges
  const yearSales = targetYear ? sales.filter(sale => sale.year === targetYear) : sales
  const yearCharges = targetYear ? charges.filter(charge => new Date(charge.expenseDate).getFullYear() === targetYear) : charges

  const caHt = yearSales.reduce((sum, sale) => sum + sale.caHt, 0)
  const caTtc = yearSales.reduce((sum, sale) => sum + sale.totalTtc, 0)
  const chargesAmount = yearCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0)
  // Chaîne cohérente : CA HT − Charges = Résultat brut ; − URSSAF (X% du CA HT) = Résultat net
  const resultNet = caHt - chargesAmount // résultat brut (avant URSSAF), clé API conservée
  const prelevementUrssaf = caHt * (tauxUrssaf / 100)
  const resultAfterUrssaf = resultNet - prelevementUrssaf // résultat net (après URSSAF)
  const averageMargin = caHt > 0 ? (resultAfterUrssaf / caHt) * 100 : 0 // marge nette = résultat net / CA HT (%)

  return {
    caHt,
    caTtc,
    chargesHt: chargesAmount,
    resultNet,
    resultAfterUrssaf,
    averageMargin
  }
}

export function calculateMonthlyData(sales: Array<{year: number, saleDate: Date, caHt: number, totalTtc: number}>, targetYear?: number) {
  const year = targetYear || new Date().getFullYear()
  const yearSales = sales.filter(sale => sale.year === year)
  
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: new Date(year, i).toLocaleDateString('fr-FR', { month: 'short' }),
    caHt: 0,
    caTtc: 0
  }))

  yearSales.forEach(sale => {
    const month = new Date(sale.saleDate).getMonth()
    monthlyData[month].caHt += sale.caHt
    monthlyData[month].caTtc += sale.totalTtc
  })

  return monthlyData
}

export function calculateServiceDistribution(sales: Array<{year: number, serviceName: string, caHt: number}>) {
  const currentYear = new Date().getFullYear()
  const yearSales = sales.filter(sale => sale.year === currentYear)
  
  const serviceMap = new Map()
  
  yearSales.forEach(sale => {
    const serviceName = sale.serviceName
    if (!serviceMap.has(serviceName)) {
      serviceMap.set(serviceName, { name: serviceName, value: 0 })
    }
    serviceMap.get(serviceName).value += sale.caHt
  })

  return Array.from(serviceMap.values())
}
