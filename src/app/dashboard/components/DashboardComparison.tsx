'use client'

interface VariationItem {
  percentage?: number
  trend?: 'up' | 'down' | 'neutral' | 'stable'
}

interface ComparisonVariations {
  caHt?: VariationItem
  chargesHt?: VariationItem
  resultNet?: VariationItem
  averageMargin?: VariationItem
}

export function DashboardComparison({
  variations,
}: {
  variations: ComparisonVariations
}) {
  const formatPct = (v?: VariationItem) =>
    v?.percentage != null ? `${v.percentage > 0 ? '+' : ''}${v.percentage.toFixed(1)}%` : '0'
  const trendClass = (v?: VariationItem, invert = false) => {
    if (!v?.trend) return 'text-foreground'
    if (invert) {
      if (v.trend === 'up') return 'text-red-400'
      if (v.trend === 'down') return 'text-emerald-400'
    } else {
      if (v.trend === 'up') return 'text-emerald-400'
      if (v.trend === 'down') return 'text-red-400'
    }
    return 'text-foreground'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">📈 Comparaison Temporelle</h2>
        <div className="h-1 w-12 sm:w-16 bg-primary rounded-full shrink-0" />
      </div>
      <div className="liquid-glass-card bg-primary/10 border border-primary/30 rounded-xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">CA HT</div>
            <div className={`text-lg font-bold ${trendClass(variations.caHt)}`}>
              {formatPct(variations.caHt)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Charges</div>
            <div className={`text-lg font-bold ${trendClass(variations.chargesHt, true)}`}>
              {formatPct(variations.chargesHt)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Résultat Net</div>
            <div className={`text-lg font-bold ${trendClass(variations.resultNet)}`}>
              {formatPct(variations.resultNet)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Marge</div>
            <div className={`text-lg font-bold ${trendClass(variations.averageMargin)}`}>
              {formatPct(variations.averageMargin)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
