'use client'

import useSWR from 'swr'
import { useMemo } from 'react'
import { buildApiParams } from '@/lib/date-utils'
import { fetchDashboard, fetchChargesBreakdown, fetchDashboardEvolution, fetchSettings as fetchSettingsRaw } from '@/lib/electron-api'
import { SWR_KEYS, fetchSettings as fetchSettingsSWR } from '@/lib/swr-fetchers'
import type { DateRange } from '@/lib/date-utils'
import type { DashboardSWRPayload, AnalyticsPayload } from '@/lib/types'

/** Payload brut du fetcher analytics (dashboard + charges + evolution + ventes en attente) */
type RawAnalyticsPayload = Omit<DashboardSWRPayload, 'companySettings'> & {
  pendingData?: { data?: { kpis?: { caTtc?: number } } }
}

async function rawAnalyticsFetcher(key: string): Promise<RawAnalyticsPayload | null> {
  const rest = key.replace(/^analytics-/, '')
  const [params, yearStr] = rest.split('::')
  const year = parseInt(yearStr || '', 10)
  
  if (!params) return null

  // On a besoin de l'évolution pour les services et les charges breakdown
  // On récupère aussi les données "pending" pour les impayés
  const [dashboardResponse, chargesResponse, evolutionResponse, pendingResponse] = await Promise.all([
    fetchDashboard(params),
    fetchChargesBreakdown(params),
    fetchDashboardEvolution(params),
    fetchDashboard(params + '&status=pending')
  ])

  if (
    dashboardResponse.status === 401 ||
    chargesResponse.status === 401 ||
    evolutionResponse.status === 401 ||
    pendingResponse.status === 401
  ) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return null
  }

  if (!dashboardResponse.ok || !chargesResponse.ok || !evolutionResponse.ok || !pendingResponse.ok) {
    throw new Error('API error')
  }

  const [dashboardData, chargesBreakdown, evolutionDataResponse, pendingData] = await Promise.all([
    dashboardResponse.json(),
    chargesResponse.json(),
    evolutionResponse.json(),
    pendingResponse.json()
  ])

  return {
    data: dashboardData,
    chargesData: chargesBreakdown,
    evolutionData: evolutionDataResponse,
    pendingData: pendingData // Données des ventes en attente
  }
}

export function useAnalyticsData(dateRange: DateRange) {
  const params = buildApiParams(dateRange)
  const year = dateRange.start.getFullYear()
  const key = `analytics-${params}::${year}`

  // 1. Settings (Taux TVA, URSSAF)
  const { data: settingsData } = useSWR(SWR_KEYS.settings, fetchSettingsSWR, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 300000
  })

  // 2. Données analytiques
  const { data: rawPayload, error, isLoading, isValidating, mutate } = useSWR(key, rawAnalyticsFetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    keepPreviousData: true,
  })

  // 3. Transformation
  const payload = useMemo<AnalyticsPayload | null>(() => {
    if (!rawPayload || !settingsData) return null

    const settingsObj = (settingsData.parameters || []).reduce(
        (acc: Record<string, unknown>, param: { key: string; value: string }) => {
          if (param.key === 'defaultTvaRate' || param.key === 'tauxUrssaf') {
            acc[param.key] = parseFloat(param.value)
          } else {
            acc[param.key] = param.value
          }
          return acc
        },
        {}
      )

      // Mapping vers le format DashboardData attendu par les composants (ou similaire)
      const chargesBreakdownList = (rawPayload.chargesData?.breakdown ?? []).map((b: any) => ({
        category: b.category,
        recurring: b.recurring ?? 0,
        oneTime: b.oneTime ?? 0,
        total: b.total ?? 0,
      }))

      // Calcul des données fiscales
      // L'API renvoie kpis.caHt directement (nombre)
      const totalSalesHt = rawPayload.data?.kpis?.caHt || 0
      const tauxUrssaf = (settingsObj.tauxUrssaf as number) || 0
      const urssafAmount = totalSalesHt * (tauxUrssaf / 100)
      
      // TVA Collectée : on utilise les KPIs globaux qui respectent la période (CA TTC - CA HT)
      const totalCaTtc = rawPayload.data?.kpis?.caTtc || 0
      const totalTvaCollected = totalCaTtc - totalSalesHt

      // Montant des impayés (ventes en attente)
      const pendingAmount = rawPayload.pendingData?.data?.kpis?.caTtc ?? 0

      return {
        kpis: rawPayload.data?.kpis, // On garde pour ref
        evolution: [], // Pas besoin du graph principal ici
        recentSales: [],
        servicesData: {
            serviceDistribution: rawPayload.data?.serviceDistribution ?? [],
            monthlyServiceEvolution: rawPayload.evolutionData?.monthlyServiceEvolution,
            serviceAnalysis: rawPayload.evolutionData?.serviceAnalysis,
            clientAnalysis: rawPayload.evolutionData?.clientAnalysis,
        },
        chargesData: {
            totals: rawPayload.chargesData?.totals,
            breakdown: chargesBreakdownList,
            detailList: chargesBreakdownList // Simplification, à affiner si besoin de liste détaillée charges
        },
        fiscalData: {
            urssaf: {
                baseAmount: totalSalesHt,
                rate: tauxUrssaf,
                amount: urssafAmount
            },
            tva: {
                collected: totalTvaCollected,
                deductible: 0, // TODO: Si on gérait la TVA sur charges
                net: totalTvaCollected
            },
            pending: {
                amount: pendingAmount
            }
        },
        companySettings: settingsObj
      }
  }, [rawPayload, settingsData])

  return { payload: payload ?? null, error, isLoading: isLoading || !payload, isValidating, mutate }
}
