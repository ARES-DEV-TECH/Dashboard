'use client'

import dynamic from 'next/dynamic'

// Types pour servicesData / chargesData (alignés sur l’API dashboard / evolution)
type ServiceDistributionItem = { name: string; value: number }
type MonthlyServiceEvolutionItem = Record<string, string | number>
type ServiceAnalysisItem = { serviceName: string; unitPrice: number; salesCount: number; salesTotal: number; chargesCount: number; chargesTotal: number; linkedClients: number }
type ClientAnalysisItem = { clientName: string; contactPerson: string; salesCount: number; salesTotal: number; chargesCount: number; chargesTotal: number; linkedServices: number }
type ChargesTotals = { breakdown?: { recurring: number; oneTime: number }; total?: number }
type ChargesBreakdownItem = { category: string; recurring: number; oneTime: number; total: number }
type ChargesDetailItem = ChargesBreakdownItem

export type DashboardData = {
  kpis: {
    caHt: { value: number; change?: number; trend?: 'up' | 'down' | 'neutral' }
    charges: { value: number; change?: number; trend?: 'up' | 'down' | 'neutral' }
    resultNet: { value: number; change?: number; trend?: 'up' | 'down' | 'neutral' }
    margin: { value: number; change?: number; trend?: 'up' | 'down' | 'neutral' }
    tva: { value: number }
    urssaf: { value: number }
    clients: { value: number; change?: number; trend?: 'up' | 'down' | 'neutral' }
  }
  evolution: {
    month: string
    ca: number
    charges: number
    result: number
  }[]
  chargesBreakdown: { category: string; amount: number; fill: string }[]
  servicesBreakdown: { service: string; amount: number; fill: string }[]
  chargesByType: { type: string; amount: number; fill: string }[]
  recentSales: {
    id: string
    client: string
    service: string
    amount: number
    status: string
    date: string
    frequency: string
    items?: any[]
  }[]
  servicesData: {
    serviceDistribution: ServiceDistributionItem[]
    monthlyServiceEvolution?: MonthlyServiceEvolutionItem[] | null
    serviceAnalysis?: ServiceAnalysisItem[]
    clientAnalysis?: ClientAnalysisItem[]
  }
  chargesData: {
    totals: ChargesTotals | null
    breakdown: ChargesBreakdownItem[]
    detailList: ChargesDetailItem[]
  }
}

const DashboardClient = dynamic(
  () =>
    import('@/components/dashboard-client').then((mod) => ({
      default: mod.DashboardClient,
    })),
  { ssr: false }
)

export function DashboardPageClient({ data, isRefreshing }: { data: DashboardData; isRefreshing?: boolean }) {
  return <DashboardClient data={data} isRefreshing={isRefreshing} />
}
