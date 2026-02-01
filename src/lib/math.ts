// Utility functions for calculations (ventes : montants CA HT, TVA, TTC)


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
