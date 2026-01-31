'use client'

import { useState, useEffect, useCallback, useMemo, memo, startTransition } from 'react'
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
import { fetchDashboard, fetchChargesBreakdown, fetchDashboardEvolution, fetchSettings } from '@/lib/electron-api'
import { calculateComparison as calculateComparisonData } from '@/lib/comparison-utils'
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
  serviceDistribution: Array<{ serviceName: string; caHt: number }>
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
  const [data, setData] = useState<DashboardData | null>(null)
  const [chargesData, setChargesData] = useState<ChargesBreakdown | null>(null)
  const [evolutionData, setEvolutionData] = useState<EvolutionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [companySettings, setCompanySettings] = useState<{ defaultTvaRate?: number; tauxUrssaf?: number } | null>(null)

  const loadDashboardData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)
      else setRefreshing(true)
      const params = buildApiParams(dateRange)
      const [dashboardResponse, chargesResponse, evolutionResponse, settingsResponse] = await Promise.all([
        fetchDashboard(params),
        fetchChargesBreakdown(params),
        fetchDashboardEvolution(dateRange.start.getFullYear()),
        fetchSettings(),
      ])

      if (
        dashboardResponse.status === 401 ||
        chargesResponse.status === 401 ||
        evolutionResponse.status === 401 ||
        settingsResponse.status === 401
      ) {
        window.location.href = '/login'
        return
      }
      if (!dashboardResponse.ok || !chargesResponse.ok || !evolutionResponse.ok) {
        throw new Error('API error')
      }

      const [dashboardData, chargesBreakdown, evolutionDataResponse, settingsData] = await Promise.all([
        dashboardResponse.json(),
        chargesResponse.json(),
        evolutionResponse.json(),
        settingsResponse.json(),
      ])

      const settingsObj = (settingsData.parameters || []).reduce((acc: Record<string, unknown>, param: { key: string; value: string }) => {
        if (param.key === 'defaultTvaRate' || param.key === 'tauxUrssaf') {
          acc[param.key] = parseFloat(param.value)
        } else {
          acc[param.key] = param.value
        }
        return acc
      }, {})

      let comparison: ReturnType<typeof calculateComparisonData> | null = null
      if (comparisonMode) {
        try {
          const previousRange = calculatePreviousPeriod(dateRange)
          const previousParams = buildApiParams(previousRange)
          const previousResponse = await fetchDashboard(previousParams)
          if (previousResponse.ok) {
            const previousData = await previousResponse.json()
            comparison = calculateComparisonData(dashboardData, previousData, dateRange, previousRange)
          }
        } catch {
          comparison = null
        }
      } else {
        comparison = null
      }

      startTransition(() => {
        setData(dashboardData)
        setChargesData(chargesBreakdown)
        setEvolutionData(evolutionDataResponse)
        setCompanySettings(settingsObj as { defaultTvaRate?: number; tauxUrssaf?: number })
        setComparisonData(comparison)
        setLoading(false)
        setRefreshing(false)
      })
    } catch {
      setLoading(false)
      setRefreshing(false)
    }
  }, [dateRange, comparisonMode])

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


  useEffect(() => {
    const isInitial = data === null && chargesData === null && evolutionData === null
    loadDashboardData(isInitial)
  }, [loadDashboardData])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') loadDashboardData()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [loadDashboardData])

  if (loading) {
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

  if (!data) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 liquid-glass-card">
        <p className="text-destructive font-medium">Erreur lors du chargement des données</p>
        <button
          onClick={() => loadDashboardData(true)}
          className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
        >
          Réessayer
        </button>
      </div>
    )
  }

  const serviceDistributionForServices = (data.serviceDistribution || []).map((d) => ({
    name: d.serviceName,
    value: d.caHt,
  }))

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 sm:pb-16">
      <DashboardFilters
        dateRange={dateRange}
        setDateRange={setDateRange}
        comparisonMode={comparisonMode}
        setComparisonMode={setComparisonMode}
        refreshing={refreshing}
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
