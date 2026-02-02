/**
 * Textes d’aide pour les tooltips (icône « i ») sur les KPIs et indicateurs.
 * Centralisés pour maintenance et éventuelles traductions.
 */

export const KPI_TOOLTIPS = {
  caHt:
    'Chiffre d’affaires hors taxes sur la période sélectionnée. Somme des ventes (quantité × prix unitaire HT).',
  charges:
    'Total des charges enregistrées sur la période (dépenses, achats, etc.).',
  resultNet:
    'Résultat net après charges et URSSAF : CA HT − charges − cotisations URSSAF (calculées selon le taux de votre entreprise).',
  margin:
    'Marge moyenne en % : (Résultat net / CA HT) × 100. Indique la rentabilité globale sur la période.',
} as const
