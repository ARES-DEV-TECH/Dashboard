// Utility functions for temporal comparison calculations

import { DateRange, calculatePreviousPeriod } from './date-utils'

export interface TrendData {
  value: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
}

export interface ComparisonData {
  current: {
    period: string
    startDate: Date
    endDate: Date
    data: {
      caHt: number
      chargesHt: number
      resultNet: number
      resultAfterUrssaf: number
      averageMargin: number
    }
  }
  previous: {
    period: string
    startDate: Date
    endDate: Date
    data: {
      caHt: number
      chargesHt: number
      resultNet: number
      resultAfterUrssaf: number
      averageMargin: number
    }
  }
  variations: {
    caHt: TrendData
    chargesHt: TrendData
    resultNet: TrendData
    resultAfterUrssaf: TrendData
    averageMargin: TrendData
  }
}

/** Seuil pour considérer une tendance (évite "stable" pour des écarts négligeables) */
const TREND_THRESHOLD_PCT = 1
/** Plafond d'affichage pour éviter des % extrêmes quand la période précédente est très faible */
const DISPLAY_CAP_PCT = 300

export function calculateTrendData(
  current: number,
  previous: number
): TrendData {
  const value = current - previous
  let percentage: number
  if (previous !== 0 && Number.isFinite(previous)) {
    percentage = (value / previous) * 100
  } else {
    // Période précédente nulle : on donne une tendance directionnelle sans infinie
    percentage = value > 0 ? 100 : value < 0 ? -100 : 0
  }
  const cappedPercentage = Math.max(-DISPLAY_CAP_PCT, Math.min(DISPLAY_CAP_PCT, percentage))

  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (Math.abs(percentage) > TREND_THRESHOLD_PCT) {
    trend = percentage > 0 ? 'up' : 'down'
  }

  return {
    value,
    percentage: cappedPercentage,
    trend
  }
}

export function calculateComparison(
  currentData: any,
  previousData: any,
  currentRange: DateRange,
  previousRange: DateRange
): ComparisonData {
  const formatPeriod = (range: DateRange) => {
    const startStr = range.start.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    })
    const endStr = range.end.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    })
    return `${startStr} - ${endStr}`
  }

  const currentCaHt = currentData.kpis?.caHt || 0
  const previousCaHt = previousData.kpis?.caHt || 0
  const currentCharges = currentData.kpis?.chargesHt || 0
  const previousCharges = previousData.kpis?.chargesHt || 0
  const currentResult = currentData.kpis?.resultNet || 0
  const previousResult = previousData.kpis?.resultNet || 0
  const currentAfterUrssaf = currentData.kpis?.resultAfterUrssaf || 0
  const previousAfterUrssaf = previousData.kpis?.resultAfterUrssaf || 0
  const currentMargin = currentData.kpis?.averageMargin ?? 0
  const previousMargin = previousData.kpis?.averageMargin ?? 0

  return {
    current: {
      period: formatPeriod(currentRange),
      startDate: currentRange.start,
      endDate: currentRange.end,
      data: {
        caHt: currentCaHt,
        chargesHt: currentCharges,
        resultNet: currentResult,
        resultAfterUrssaf: currentAfterUrssaf,
        averageMargin: currentMargin
      }
    },
    previous: {
      period: formatPeriod(previousRange),
      startDate: previousRange.start,
      endDate: previousRange.end,
      data: {
        caHt: previousCaHt,
        chargesHt: previousCharges,
        resultNet: previousResult,
        resultAfterUrssaf: previousAfterUrssaf,
        averageMargin: previousMargin
      }
    },
    variations: {
      caHt: calculateTrendData(currentCaHt, previousCaHt),
      chargesHt: calculateTrendData(currentCharges, previousCharges),
      resultNet: calculateTrendData(currentResult, previousResult),
      resultAfterUrssaf: calculateTrendData(currentAfterUrssaf, previousAfterUrssaf),
      averageMargin: calculateTrendData(currentMargin, previousMargin)
    }
  }
}


export function getComparisonInsights(comparison: ComparisonData): string[] {
  const insights: string[] = []
  
  // Analyse du CA
  if (comparison.variations.caHt.trend === 'up') {
    insights.push(`📈 CA en hausse de ${comparison.variations.caHt.percentage.toFixed(1)}%`)
  } else if (comparison.variations.caHt.trend === 'down') {
    insights.push(`📉 CA en baisse de ${Math.abs(comparison.variations.caHt.percentage).toFixed(1)}%`)
  }
  
  // Analyse des charges (baisse = bon, hausse = à surveiller)
  if (comparison.variations.chargesHt.trend === 'down') {
    insights.push(`💰 Charges en baisse (-${Math.abs(comparison.variations.chargesHt.percentage).toFixed(1)}%)`)
  } else if (comparison.variations.chargesHt.trend === 'up') {
    insights.push(`⚠️ Charges en hausse (+${comparison.variations.chargesHt.percentage.toFixed(1)}%)`)
  }
  
  // Analyse du résultat
  if (comparison.variations.resultAfterUrssaf.trend === 'up') {
    insights.push(`🎯 Rentabilité améliorée (+${comparison.variations.resultAfterUrssaf.percentage.toFixed(1)}%)`)
  } else if (comparison.variations.resultAfterUrssaf.trend === 'down') {
    insights.push(`📊 Rentabilité en baisse (-${Math.abs(comparison.variations.resultAfterUrssaf.percentage).toFixed(1)}%)`)
  }
  
  // Analyse globale
  const allPositive = Object.values(comparison.variations).every(v => v.trend === 'up')
  const allNegative = Object.values(comparison.variations).every(v => v.trend === 'down')
  
  if (allPositive) {
    insights.push('🚀 Performance exceptionnelle sur tous les indicateurs')
  } else if (allNegative) {
    insights.push('⚠️ Attention : tous les indicateurs sont en baisse')
  }
  
  return insights
}

export function getPerformanceScore(comparison: ComparisonData): number {
  let score = 0
  const weights = {
    caHt: 0.25,
    chargesHt: 0.2,
    resultNet: 0.25,
    resultAfterUrssaf: 0.2,
    averageMargin: 0.1
  }

  Object.entries(comparison.variations).forEach(([key, data]) => {
    const weight = weights[key as keyof typeof weights] ?? 0.2
    // Pour les charges : baisse = bon (100), hausse = mauvais (0)
    const isGoodUp = key !== 'chargesHt'
    const isPositive = isGoodUp ? data.trend === 'up' : data.trend === 'down'
    const isNegative = isGoodUp ? data.trend === 'down' : data.trend === 'up'

    if (isPositive) {
      score += weight * 100
    } else if (isNegative) {
      score += weight * 0
    } else {
      score += weight * 50
    }
  })

  return Math.round(score)
}

export function getPerformanceLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Bon'
  if (score >= 40) return 'Moyen'
  if (score >= 20) return 'Faible'
  return 'Critique'
}

export function getPerformanceColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-blue-600'
  if (score >= 40) return 'text-yellow-600'
  if (score >= 20) return 'text-orange-600'
  return 'text-red-600'
}
