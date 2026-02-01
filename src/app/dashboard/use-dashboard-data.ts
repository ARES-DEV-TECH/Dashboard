'use client'

import useSWR from 'swr'
import { buildApiParams } from '@/lib/date-utils'
import { fetchDashboard, fetchChargesBreakdown, fetchDashboardEvolution, fetchSettings } from '@/lib/electron-api'
import type { DateRange } from '@/lib/date-utils'
import type { DashboardData, EvolutionData, ChargesBreakdown, DashboardSWRPayload } from '@/lib/types'

export type { DashboardData, EvolutionData, ChargesBreakdown, DashboardSWRPayload } from '@/lib/types'

async function fetcher(key: string): Promise<DashboardSWRPayload | null> {
  const rest = key.replace(/^dashboard-/, '')
  const [params, yearStr] = rest.split('::')
  const year = parseInt(yearStr || '', 10)
  if (!params || Number.isNaN(year)) return null

  const [dashboardResponse, chargesResponse, evolutionResponse, settingsResponse] = await Promise.all([
    fetchDashboard(params),
    fetchChargesBreakdown(params),
    fetchDashboardEvolution(year),
    fetchSettings(),
  ])

  if (
    dashboardResponse.status === 401 ||
    chargesResponse.status === 401 ||
    evolutionResponse.status === 401 ||
    settingsResponse.status === 401
  ) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return null
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

  return {
    data: dashboardData,
    chargesData: chargesBreakdown,
    evolutionData: evolutionDataResponse,
    companySettings: settingsObj as { defaultTvaRate?: number; tauxUrssaf?: number },
  }
}

export function useDashboardData(dateRange: DateRange) {
  const params = buildApiParams(dateRange)
  const year = dateRange.start.getFullYear()
  const key = `dashboard-${params}::${year}`

  const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardSWRPayload | null>(key, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    keepPreviousData: true,
  })

  return {
    payload: data ?? null,
    error,
    isLoading,
    isValidating,
    mutate,
  }
}
