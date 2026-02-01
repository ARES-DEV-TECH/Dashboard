'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import dynamic from 'next/dynamic'
import {
  TrendingUp,
  TrendingDown,
  Euro,
  Users,
  Target,
  Calculator,
} from 'lucide-react'
import { DateRange, buildApiParams, calculatePresetDates, calculatePreviousPeriod } from '@/lib/date-utils'
import { fetchDashboard } from '@/lib/electron-api'
import { calculateComparison as calculateComparisonData } from '@/lib/comparison-utils'
import { useDashboardData } from './use-dashboard-data'
import { DashboardFilters } from './components/DashboardFilters'
import { DashboardKPIs, type KpiItem } from './components/DashboardKPIs'
import { DashboardComparison } from './components/DashboardComparison'

const DashboardCharges = dynamic(
  () => import('./components/DashboardCharges').then((m) => ({ default: m.DashboardCharges })),
  { ssr: false, loading: () => <div className="h-64 bg-muted/30 rounded-xl animate-pulse" /> }
)

const DashboardEvolution = dynamic(
  () => import('./components/DashboardEvolution').then((m) => ({ default: m.DashboardEvolution })),
  { ssr: false, loading: () => <div className="h-64 bg-muted/30 rounded-xl animate-pulse" /> }
)
const DashboardServices = dynamic(
  () => import('./components/DashboardServices').then((m) => ({ default: m.DashboardServices })),
  { ssr: false, loading: () => <div className="h-64 bg-muted/30 rounded-xl animate-pulse" /> }
)

interface DashboardData {
  kpis: {
    caHt: number
    caTtc: number
    chargesHt: number
    resultNet: number
    resultAfterUrssaf: number
    averageMargin: number
  }
  monthlyData: Array<{ month: number; monthName: string; caHt: number; caTtc: number; chargesHt: number }>
  serviceDistribution: Array<{ name: string; value: number }>
}

interface EvolutionData {
  year: number
  monthlyEvolution: Array<{
    month: number
    monthName: string
    sales: { count: number; totalHt: number; totalTtc: number; linkedCount: number }
    charges: { count: number; totalHt: number; totalTtc: number; linkedCount: number; crossLinkedCount: number }
    result: number
  }>
  monthlyServiceEvolution?: Array<{ month: number; monthName: string; [k: string]: string | number }>
  globalKpis: { linkedSalesCount: number }
  serviceAnalysis: Array<{
    serviceName: string
    unitPrice: number
    salesCount: number
    salesTotal: number
    chargesCount: number
    chargesTotal: number
    linkedClients: number
  }>
  clientAnalysis: Array<{
    clientName: string
    contactPerson: string
    salesCount: number
    salesTotal: number
    chargesCount: number
    chargesTotal: number
    linkedServices: number
  }>
}

interface ChargesBreakdown {
  breakdown: Array<{
    category: string
    recurring: number
    oneTime: number
    total: number
  }>
  totals: { breakdown?: { recurring: number; oneTime: number } }
}

const DashboardContent = memo(function DashboardContent() {
  const [dateRange, setDateRange] = useState<DateRange>(() => calculatePresetDates('thisMonth'))
  const [comparisonMode, setComparisonMode] = useState(true)
  const [comparisonData, setComparisonData] = useState<{ variations?: Record<string, { percentage?: number; trend?: 'up' | 'down' | 'neutral' | 'stable' }> } | null>(null)

  const { payload, error, isLoading, isValidating, mutate } = useDashboardData(dateRange)
  const data = payload?.data ?? null
  const chargesData = payload?.chargesData ?? null
  const evolutionData = payload?.evolutionData ?? null
  const companySettings = payload?.companySettings ?? null

  // Comparaison période précédente (fetch séparé, optionnel)
  useEffect(() => {
    if (!comparisonMode || !data) {
      setComparisonData(null)
      return
    }
    let cancelled = false
    const run = async () => {
      try {
        const previousRange = calculatePreviousPeriod(dateRange)
        const previousParams = buildApiParams(previousRange)
        const previousResponse = await fetchDashboard(previousParams)
        if (cancelled || !previousResponse.ok) return
        const previousData = await previousResponse.json()
        const comparison = calculateComparisonData(data, previousData, dateRange, previousRange)
        if (!cancelled) setComparisonData(comparison)
      } catch {
        if (!cancelled) setComparisonData(null)
      }
    }
    run()
    return () => { cancelled = true }
  }, [dateRange, comparisonMode, data])

  const handleRetry = () => mutate()

  const memoizedKPIs = useMemo((): KpiItem[] => {
    if (!data?.kpis) return []
    const defaultTvaRate = companySettings?.defaultTvaRate ?? 20
    const getVariationText = (key: string) => {
      const v = comparisonData?.variations?.[key]
      return v?.percentage != null ? `${v.percentage > 0 ? '+' : ''}${v.percentage.toFixed(1)}%` : '--'
    }
    const getVariationType = (key: string): 'positive' | 'negative' | 'neutral' => {
      const v = comparisonData?.variations?.[key]
      if (!v?.trend) return 'neutral'
      if (key === 'chargesHt') return v.trend === 'up' ? 'negative' : v.trend === 'down' ? 'positive' : 'neutral'
      return v.trend === 'up' ? 'positive' : v.trend === 'down' ? 'negative' : 'neutral'
    }

    const base: KpiItem[] = [
      { title: 'CA HT', value: `${data.kpis.caHt.toLocaleString()}€`, change: getVariationText('caHt'), changeType: getVariationType('caHt'), icon: Euro },
      { title: 'Charges', value: `${data.kpis.chargesHt.toLocaleString()}€`, change: getVariationText('chargesHt'), changeType: getVariationType('chargesHt'), icon: TrendingDown },
      { title: 'TVA Totale', value: `${(data.kpis.caTtc - data.kpis.caHt).toLocaleString()}€`, change: `${defaultTvaRate}% TTC`, changeType: 'neutral', icon: Calculator },
      { title: 'Résultat Brut', value: `${data.kpis.resultNet.toLocaleString()}€`, change: 'CA HT − Charges', changeType: 'positive', icon: TrendingUp },
      { title: 'Marge Moyenne', value: `${data.kpis.averageMargin.toFixed(1)}%`, change: 'Résultat net / CA HT', changeType: getVariationType('averageMargin'), icon: Target },
    ]

    if (evolutionData?.globalKpis) {
      const tauxUrssaf = companySettings?.tauxUrssaf ?? 22
      const sommeUrssaf = data.kpis.caHt * (tauxUrssaf / 100)
      base.push(
        { title: 'Prélèvement URSSAF', value: `${sommeUrssaf.toFixed(2)}€`, change: `${tauxUrssaf}% du CA HT`, changeType: 'neutral', icon: Calculator },
        { title: 'Résultat Net', value: `${data.kpis.resultAfterUrssaf.toFixed(2)}€`, change: 'Après charges et URSSAF', changeType: getVariationType('resultNet'), icon: TrendingUp },
        { title: 'Nombre de clients', value: `${evolutionData.clientAnalysis.length}`, change: `${evolutionData.globalKpis.linkedSalesCount} ventes`, changeType: 'positive', icon: Users },
      )
    }
    return base
  }, [data?.kpis, evolutionData, companySettings, comparisonData])

  const memoizedChargesData = useMemo(() => {
    if (!chargesData?.breakdown) return []
    return chargesData.breakdown.map((item) => ({
      category: item.category,
      recurring: item.recurring,
      oneTime: item.oneTime,
      total: item.total,
    }))
  }, [chargesData?.breakdown])


  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card liquid-glass-card p-6 rounded-xl border border-border">
              <div className="h-4 w-24 bg-muted animate-pulse rounded mb-2" />
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="md:col-span-2 h-80 bg-muted/30 rounded-xl animate-pulse" />
          <div className="h-80 bg-muted/30 rounded-xl animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-72 bg-muted/30 rounded-xl animate-pulse" />
          <div className="h-72 bg-muted/30 rounded-xl animate-pulse" />
          <div className="h-72 bg-muted/30 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (error || (!isLoading && !data)) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 liquid-glass-card">
        <p className="text-destructive font-medium">Erreur lors du chargement des données</p>
        <button
          onClick={handleRetry}
          className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          Réessayer
        </button>
      </div>
    )
  }

  // L’API renvoie déjà { name, value } ; accepter aussi l’ancien format { serviceName, caHt }
  const serviceDistributionForServices = (data?.serviceDistribution || []).map((d: { name?: string; value?: number; serviceName?: string; caHt?: number }) => ({
    name: d.name ?? d.serviceName ?? '',
    value: Number(d.value ?? d.caHt ?? 0),
  }))

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 sm:pb-16">
      <DashboardFilters
        dateRange={dateRange}
        setDateRange={setDateRange}
        comparisonMode={comparisonMode}
        setComparisonMode={setComparisonMode}
        refreshing={isValidating}
      />

      <DashboardKPIs kpis={memoizedKPIs} />

      {comparisonMode && comparisonData?.variations && (
        <DashboardComparison variations={comparisonData.variations} />
      )}

      {evolutionData && (
        <DashboardEvolution
          evolutionData={{
            year: evolutionData.year,
            monthlyEvolution: evolutionData.monthlyEvolution,
          }}
        />
      )}

      <DashboardCharges
        totals={chargesData?.totals ?? null}
        breakdown={chargesData?.breakdown ?? []}
        detailList={memoizedChargesData}
      />

      <DashboardServices
        serviceDistribution={serviceDistributionForServices}
        monthlyServiceEvolution={evolutionData?.monthlyServiceEvolution ?? null}
        serviceAnalysis={evolutionData?.serviceAnalysis}
        clientAnalysis={evolutionData?.clientAnalysis}
      />
    </div>
  )
})

export { DashboardContent }
