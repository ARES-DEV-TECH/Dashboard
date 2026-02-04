// Utility functions for calculations (ventes : montants CA HT, TVA, TTC)


/**
 * Calcule les montants d'une vente (CA HT, TVA, TTC).
 * Si tvaRate est fourni (côté serveur), on l'utilise ; sinon on charge les paramètres (côté client).
 */
export async function calculateSaleAmounts(
  quantityOrItems: number | any[],
  unitPriceHt?: number,
  optionsTotal: number = 0,
  tvaRate?: number
) {
  let rate = tvaRate
  if (rate == null) {
    const { getCompanySettings } = await import('./settings')
    const companySettings = await getCompanySettings()
    rate = companySettings.defaultTvaRate ?? 20
  }

  let caHt = 0

  if (Array.isArray(quantityOrItems)) {
    // Multi-service calculation
    caHt = quantityOrItems.reduce((sum, item) => {
      return sum + ((item.quantity || 0) * (item.unitPriceHt || 0))
    }, 0)
  } else {
    // Single service calculation (legacy compatibility)
    caHt = (quantityOrItems || 0) * (unitPriceHt || 0)
  }

  caHt += optionsTotal
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
