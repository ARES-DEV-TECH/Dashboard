'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { useDashboardData } from './use-dashboard-data'
import { calculatePresetDates, type DateRange } from '@/lib/date-utils'
import type { DashboardData } from '@/components/dashboard-page-client'
import { SWR_KEYS, fetchSales } from '@/lib/swr-fetchers'
import { SWR_LIST_OPTIONS } from '@/lib/swr-config'
import useSWR from 'swr'
import { PresetHeader } from '@/components/preset-header'
import { ContentTransition } from '@/components/ContentTransition'
import DashboardLoading from './loading'

const DashboardPageClient = dynamic(
  () => import('@/components/dashboard-page-client').then((m) => ({ default: m.DashboardPageClient })),
  { ssr: false }
)

function mapToPresetDashboardData(
  payload: Awaited<ReturnType<typeof import('./use-dashboard-data').dashboardFetcher>>,
  comparisonData: { variations?: Record<string, { percentage?: number; trend?: 'up' | 'down' | 'neutral' | 'stable' }> } | null,
  recentSales: Array<{ invoiceNo: string; clientName: string; serviceName?: string; totalTtc: number; saleDate: string; status?: unknown; recurring?: boolean; recurringType?: string | null; items?: string | any[] }>
): DashboardData | null {
  if (!payload?.data?.kpis) return null
  const d = payload.data
  const ev = payload.evolutionData
  const company = payload.companySettings
  const tauxUrssaf = company?.tauxUrssaf ?? 22
  const getChange = (key: string) => comparisonData?.variations?.[key]?.percentage
  const getTrend = (key: string): 'up' | 'down' | 'neutral' => {
    const t = comparisonData?.variations?.[key]?.trend
    if (!t || t === 'stable') return 'neutral'
    return t
  }

  const evolution = (ev?.monthlyEvolution ?? []).map((m: { monthName: string; sales?: { totalHt: number }; charges?: { totalHt: number }; result?: number }) => ({
    month: m.monthName,
    ca: m.sales?.totalHt ?? 0,
    charges: m.charges?.totalHt ?? 0,
    result: m.result ?? 0,
  }))

  const chargesBreakdownList = (payload.chargesData?.breakdown ?? []).map((b: any) => ({
    category: b.category,
    recurring: b.recurring ?? 0,
    oneTime: b.oneTime ?? 0,
    total: b.total ?? 0,
  }))

  return {
    kpis: {
      caHt: { value: d.kpis.caHt, change: getChange('caHt'), trend: getTrend('caHt') },
      charges: { value: d.kpis.chargesHt, change: getChange('chargesHt'), trend: getTrend('chargesHt') },
      resultNet: {
        value: company ? d.kpis.resultAfterUrssaf : d.kpis.resultNet,
        change: getChange('resultAfterUrssaf') ?? getChange('resultNet'),
        trend: getTrend('resultAfterUrssaf') ?? getTrend('resultNet'),
      },
      margin: { value: d.kpis.averageMargin, change: getChange('averageMargin'), trend: getTrend('averageMargin') },
      tva: { value: d.kpis.caTtc - d.kpis.caHt },
      urssaf: { value: d.kpis.caHt * (tauxUrssaf / 100) },
      clients: {
        value: ev?.clientAnalysis?.length ?? 0,
        change: undefined,
        trend: 'neutral' as const,
      },
    },
    evolution,
    chargesBreakdown: (payload.chargesData?.breakdown ?? []).map((b: { category: string; total: number }) => ({
      category: b.category,
      amount: b.total,
      fill: 'var(--chart-1)',
    })),
    servicesBreakdown: (d.serviceDistribution ?? []).map((s: { name: string; value: number }, i: number) => ({
      service: s.name,
      amount: s.value,
      fill: `var(--chart-${(i % 5) + 1})`,
    })),
    chargesByType: [
      { type: 'Récurrentes', amount: payload.chargesData?.totals?.breakdown?.recurring ?? 0, fill: 'var(--chart-1)' },
      { type: 'Ponctuelles', amount: payload.chargesData?.totals?.breakdown?.oneTime ?? 0, fill: 'var(--chart-2)' },
    ],
    recentSales: recentSales.map((s) => {
      const statusStr = String(s.status ?? 'paid')
      return {
        id: s.invoiceNo,
        client: s.clientName,
        service: s.serviceName ?? '—',
        amount: s.totalTtc,
        status: statusStr === 'paid' ? 'Payée' : statusStr === 'pending' ? 'En attente' : statusStr === 'cancelled' ? 'Annulée' : statusStr,
        date: s.saleDate?.split('T')[0] ?? '',
        frequency: s.recurring ? (s.recurringType === 'mensuel' ? 'Mensuel' : s.recurringType === 'annuel' ? 'Annuel' : 'Ponctuel') : 'Ponctuel',
        items: typeof s.items === 'string' ? JSON.parse(s.items) : s.items,
      }
    }),
    servicesData: {
      serviceDistribution: d.serviceDistribution ?? [],
      monthlyServiceEvolution: ev?.monthlyServiceEvolution,
      serviceAnalysis: ev?.serviceAnalysis,
      clientAnalysis: ev?.clientAnalysis,
    },
    chargesData: {
      totals: payload.chargesData?.totals as any,
      breakdown: chargesBreakdownList,
      detailList: chargesBreakdownList,
    }
  }
}

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>(() => calculatePresetDates('thisMonth'))
  const { payload, error, isLoading, isValidating } = useDashboardData(dateRange)
  const { data: salesData } = useSWR(SWR_KEYS.sales, fetchSales, SWR_LIST_OPTIONS)

  const sales = salesData?.sales ?? []
  const recentSales = useMemo(
    () =>
      [...sales]
        .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
        .map((s) => ({
          invoiceNo: s.invoiceNo,
          clientName: s.clientName,
          serviceName: s.serviceName ?? '',
          totalTtc: s.totalTtc,
          saleDate: typeof s.saleDate === 'string' ? s.saleDate : new Date(s.saleDate).toISOString(),
          status: s.status || 'paid',
          recurring: (s as { recurring?: boolean }).recurring,
          recurringType: (s as { recurringType?: string | null }).recurringType,
        })),
    [sales]
  )

  const presetData = useMemo(() => {
    if (!payload) return null
    return mapToPresetDashboardData(payload, payload.comparisonData ?? null, recentSales)
  }, [payload, recentSales])

  if (error) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <div className="text-destructive">Erreur lors du chargement des données.</div>
      </div>
    )
  }

  const loading = isLoading && !presetData

  return (
    <>
      <PresetHeader
        title="Tableau de bord"
        description="Vue d'ensemble de votre activité financière."
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        isLoading={loading}
      />
      <ContentTransition
        isLoading={loading}
        loadingComponent={<DashboardLoading />}
        className="min-h-0"
      >
        {presetData ? (
          <DashboardPageClient data={presetData} isRefreshing={isValidating} />
        ) : (
          <div className="min-h-[400px]" />
        )}
      </ContentTransition>
    </>
  )
}
