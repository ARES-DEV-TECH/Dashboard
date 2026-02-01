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
  serviceDistribution: Array<{ serviceName: string; caHt: number }>
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

export interface ChargesBreakdown {
  breakdown: Array<{
    category: string
    recurring: number
    oneTime: number
    total: number
  }>
  totals?: { breakdown?: { recurring: number; oneTime: number } }
}

export interface DashboardSWRPayload {
  data: DashboardData
  chargesData: ChargesBreakdown
  evolutionData: EvolutionData
  companySettings: { defaultTvaRate?: number; tauxUrssaf?: number }
}
