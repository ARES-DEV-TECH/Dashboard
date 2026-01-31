'use client'

import { DateRange, calculatePresetDates } from '@/lib/date-utils'

function formatDateForInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function DashboardFilters({
  dateRange,
  setDateRange,
  comparisonMode,
  setComparisonMode,
}: {
  dateRange: DateRange
  setDateRange: (range: DateRange) => void
  comparisonMode: boolean
  setComparisonMode: (v: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <select
          value={dateRange.preset}
          onChange={(e) => setDateRange(calculatePresetDates(e.target.value as Parameters<typeof calculatePresetDates>[0]))}
          className="w-full sm:w-auto min-w-0 sm:min-w-[140px] h-9 sm:h-8 text-sm border border-border rounded-lg px-3 bg-card text-foreground"
          aria-label="Période"
        >
          <option value="ytd">YTD</option>
          <option value="thisMonth">Ce mois</option>
          <option value="lastMonth">Mois dernier</option>
          <option value="thisYear">Cette année</option>
          <option value="lastYear">Année dernière</option>
          <option value="thisWeek">Cette semaine</option>
          <option value="lastWeek">Semaine dernière</option>
          <option value="custom">Personnalisé</option>
        </select>

        {dateRange.preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <label className="text-xs text-foreground/70 shrink-0">Du</label>
            <input
              type="date"
              value={formatDateForInput(dateRange.start)}
              onChange={(e) => {
                const v = e.target.value
                if (!v) return
                const newStart = new Date(v + 'T00:00:00')
                const end = dateRange.end
                if (newStart.getTime() > end.getTime()) {
                  setDateRange({ start: newStart, end: new Date(newStart), preset: 'custom' })
                } else {
                  setDateRange({ start: newStart, end, preset: 'custom' })
                }
              }}
              className="h-9 sm:h-8 text-sm border border-border rounded-lg px-2 bg-card text-foreground min-w-[120px] flex-1 sm:flex-none"
            />
            <label className="text-xs text-foreground/70 shrink-0">au</label>
            <input
              type="date"
              value={formatDateForInput(dateRange.end)}
              onChange={(e) => {
                const v = e.target.value
                if (!v) return
                const newEnd = new Date(v + 'T23:59:59')
                const start = dateRange.start
                if (newEnd.getTime() < start.getTime()) {
                  setDateRange({ start: new Date(newEnd), end: newEnd, preset: 'custom' })
                } else {
                  setDateRange({ start, end: newEnd, preset: 'custom' })
                }
              }}
              className="h-9 sm:h-8 text-sm border border-border rounded-lg px-2 bg-card text-foreground min-w-[120px] flex-1 sm:flex-none"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setComparisonMode(!comparisonMode)}
          className={`px-3 py-2 sm:py-1.5 text-xs rounded-lg border transition-colors touch-manipulation ${
            comparisonMode
              ? 'bg-primary/20 text-primary border-primary/50'
              : 'bg-muted text-foreground/80 border-border'
          }`}
        >
          {comparisonMode ? 'Comparaison ON' : 'Comparaison OFF'}
        </button>
      </div>
      <div className="text-xs text-foreground/70 shrink-0">
        {dateRange.start.toLocaleDateString('fr-FR')} — {dateRange.end.toLocaleDateString('fr-FR')}
      </div>
    </div>
  )
}
