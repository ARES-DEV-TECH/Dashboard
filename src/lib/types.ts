/**
 * Types centralisés – point d’entrée pour Client, Article, Sale, Charge, Dashboard, API.
 * Les types métier (Client, Article, etc.) sont dérivés des schémas Zod dans validations.
 */

export type {
  Client,
  Article,
  Sale,
  Charge,
  QuoteItem,
  Quote,
} from '@/lib/validations'

/** Pagination commune aux réponses API listes */
export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface SalesResponse {
  sales: Array<{
    invoiceNo: string
    saleDate: string
    clientName: string
    serviceName: string
    quantity: number
    unitPriceHt: number
    caHt: number
    tvaAmount?: number
    totalTtc: number
    year?: number
    options?: string
    [key: string]: unknown
  }>
  pagination?: Pagination
}

export interface ChargesResponse {
  charges: import('@/lib/validations').Charge[]
  pagination?: Pagination
}

export interface SettingsResponse {
  parameters: Array<{ key: string; value: string }>
}

/** Données agrégées du dashboard (KPIs, mensuels, répartition par service) */
export interface DashboardData {
  kpis: {
    caHt: number
    caTtc: number
    chargesHt: number
    resultNet: number
    resultAfterUrssaf: number
    averageMargin: number
  }
  monthlyData: Array<{
    month: number
    monthName: string
    caHt: number
    caTtc: number
    chargesHt: number
  }>
  /** Répartition CA par service (API renvoie name + value pour Recharts) */
  serviceDistribution: Array<{ name: string; value: number }>
}

export interface EvolutionData {
  year: number
  monthlyEvolution: Array<{
    month: number
    monthName: string
    sales: { count: number; totalHt: number; totalTtc: number; linkedCount: number }
    charges: {
      count: number
      totalHt: number
      totalTtc: number
      linkedCount: number
      crossLinkedCount: number
    }
    result: number
  }>
  monthlyServiceEvolution?: Array<{ month: number; monthName: string; [k: string]: string | number }>
  globalKpis: { 
    linkedSalesCount: number
    recurringShare?: number
    oneTimeShare?: number
  }
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

export interface ChargesBreakdown {
  breakdown: Array<{
    category: string
    recurring: number
    oneTime: number
    total: number
  }>
  totals?: { breakdown?: { recurring: number; oneTime: number } }
}

import type { ComparisonData } from '@/lib/comparison-utils'

export interface DashboardSWRPayload {
  data: DashboardData
  chargesData: ChargesBreakdown
  evolutionData: EvolutionData
  companySettings: { defaultTvaRate?: number; tauxUrssaf?: number }
  comparisonData?: ComparisonData
}

/** Payload retourné par useAnalyticsData (Analytics page) – inclut fiscalData, servicesData, chargesData */
export interface AnalyticsPayload {
  kpis?: unknown
  evolution: unknown[]
  recentSales: unknown[]
  servicesData: {
    serviceDistribution: Array<{ name: string; value: number }>
    monthlyServiceEvolution?: unknown
    serviceAnalysis?: unknown[]
    clientAnalysis?: unknown[]
    revenueDistribution?: { recurring: number; oneTime: number }
  }
  chargesData: {
    totals?: unknown
    breakdown: Array<{ category: string; recurring: number; oneTime: number; total: number }>
    detailList?: unknown[]
  }
  fiscalData: {
    urssaf: { baseAmount: number; rate: number; amount: number }
    tva: { collected: number; deductible: number; net: number }
    pending?: { amount: number }
  }
  companySettings?: Record<string, unknown>
}
