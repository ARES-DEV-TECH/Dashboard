'use client'

import useSWR from 'swr'
import { useMemo } from 'react'
import { buildApiParams, calculatePreviousPeriod } from '@/lib/date-utils'
import { fetchDashboard, fetchChargesBreakdown, fetchDashboardEvolution, fetchSettings as fetchSettingsRaw } from '@/lib/electron-api'
import { SWR_KEYS, fetchSettings as fetchSettingsSWR } from '@/lib/swr-fetchers'
import { SWR_CACHE_LONG_OPTIONS } from '@/lib/swr-config'
import { calculateComparison } from '@/lib/comparison-utils'
import type { DateRange } from '@/lib/date-utils'
import type { DashboardData, EvolutionData, ChargesBreakdown, DashboardSWRPayload } from '@/lib/types'

export type { DashboardData, EvolutionData, ChargesBreakdown, DashboardSWRPayload } from '@/lib/types'

// Fetcher optimisé : ne charge QUE les données dynamiques du dashboard
export async function rawDashboardFetcher(key: string): Promise<Omit<DashboardSWRPayload, 'companySettings'> | null> {
  const rest = key.replace(/^dashboard::/, '')
  const [params, previousParams, yearStr] = rest.split('::')
  const year = parseInt(yearStr || '', 10)
  
  if (!params || Number.isNaN(year)) return null

  // Requêtes parallèles : Données actuelles + Comparaison (si dispo)
  const promises: Promise<any>[] = [
    fetchDashboard(params),
    fetchChargesBreakdown(params),
    fetchDashboardEvolution(params),
  ]

  // Si on a des params pour la période précédente, on fetch aussi le dashboard pour comparer
  if (previousParams && previousParams !== 'null') {
    promises.push(fetchDashboard(previousParams))
  }

  const responses = await Promise.all(promises)
  
  const dashboardResponse = responses[0]
  const chargesResponse = responses[1]
  const evolutionResponse = responses[2]
  const previousResponse = responses[3] // Peut être undefined

  if (
    dashboardResponse.status === 401 ||
    chargesResponse.status === 401 ||
    evolutionResponse.status === 401
  ) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return null
  }

  if (!dashboardResponse.ok || !chargesResponse.ok || !evolutionResponse.ok) {
    throw new Error('API error')
  }

  const [dashboardData, chargesBreakdown, evolutionDataResponse] = await Promise.all([
    dashboardResponse.json(),
    chargesResponse.json(),
    evolutionResponse.json(),
  ])

  let comparisonData = null
  if (previousResponse && previousResponse.ok) {
    const previousDashboardData = await previousResponse.json()
    // On reconstruit les ranges pour le calcul (approximatif car on a que les params ici, mais suffisant pour l'affichage)
    // Idéalement on devrait passer les ranges complets, mais ici on va juste utiliser les données brutes
    // calculateComparison a besoin des ranges pour l'affichage des dates "Période précédente".
    // On va simuler des ranges vides ou basiques si on ne les a pas, l'important c'est les %
    // TODO: Passer les ranges dans le key SWR est trop lourd. 
    // On va modifier calculateComparison pour accepter des ranges optionnels ou juste ignorer l'affichage des dates de comparaison si non critiques.
    // Ou mieux : on ne calcule pas le comparisonData ici mais dans le hook useDashboardData qui a les dates ?
    // Non, le fetcher doit retourner la data prête.
    
    // On retourne les données brutes de comparaison, le mapping se fera plus haut ou on simplifie.
    // Pour l'instant, on va retourner dashboardData et previousDashboardData et laisser le hook finaliser le calcul comparison
    
    // Hack: on stocke previousData dans comparisonData temporairement, le calcul final se fera dans le hook qui a les dates
    comparisonData = { previousData: previousDashboardData } 
  }

  return {
    data: dashboardData,
    chargesData: chargesBreakdown,
    evolutionData: evolutionDataResponse,
    comparisonData: comparisonData as any // Sera affiné dans le hook
  }
}

// Fetcher original maintenu pour compatibilité (warmup)
export async function dashboardFetcher(key: string): Promise<DashboardSWRPayload | null> {
  // Adaptation du format de clé pour le warmup (qui utilise l'ancien format parfois ou le nouveau)
  // Si key commence par dashboard-, c'est l'ancien format. On le convertit.
  let fetchKey = key
  if (key.startsWith('dashboard-')) {
     const rest = key.replace(/^dashboard-/, '')
     const [params, yearStr] = rest.split('::')
     fetchKey = `dashboard::${params}::null::${yearStr}`
  }

  const raw = await rawDashboardFetcher(fetchKey)
  const settingsRes = await fetchSettingsRaw()
  if (!raw || !settingsRes.ok) return null
  
  const settingsData = await settingsRes.json()
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
    ...raw,
    companySettings: settingsObj as { defaultTvaRate?: number; tauxUrssaf?: number },
  }
}

export function useDashboardData(dateRange: DateRange) {
  const params = buildApiParams(dateRange)
  
  // Calcul période précédente pour comparaison
  const previousRange = calculatePreviousPeriod(dateRange)
  const previousParams = buildApiParams(previousRange)
  
  const year = dateRange.start.getFullYear()
  const key = `dashboard::${params}::${previousParams}::${year}`

  // 1. Charger les settings avec leur propre cache (SWR_KEYS.settings)
  const { data: settingsData } = useSWR(SWR_KEYS.settings, fetchSettingsSWR, SWR_CACHE_LONG_OPTIONS)

  const { data: rawPayload, error, isLoading, isValidating, mutate } = useSWR(key, rawDashboardFetcher, {
    ...SWR_CACHE_LONG_OPTIONS,
    keepPreviousData: true,
  })

  // Valeurs par défaut pour afficher le dashboard sans attendre les settings (fluidité)
  const DEFAULT_COMPANY_SETTINGS = { defaultTvaRate: 20, tauxUrssaf: 22 }

  // 3. Combiner les données et calculer la comparaison (dès que rawPayload est prêt, settings optionnels)
  const payload = useMemo<DashboardSWRPayload | null>(() => {
    if (!rawPayload) return null

    const settingsObj = settingsData
      ? (settingsData.parameters || []).reduce(
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
      : DEFAULT_COMPANY_SETTINGS

    // Finaliser le calcul de comparaison si on a les données précédentes
    let finalComparison = undefined
    if (rawPayload.comparisonData && (rawPayload.comparisonData as any).previousData) {
        finalComparison = calculateComparison(
            rawPayload.data, 
            (rawPayload.comparisonData as any).previousData,
            dateRange,
            previousRange
        )
    }

    return {
      ...rawPayload,
      companySettings: settingsObj as { defaultTvaRate?: number; tauxUrssaf?: number },
      comparisonData: finalComparison
    }
  }, [rawPayload, settingsData, dateRange, previousRange])

  return {
    payload: payload ?? null,
    error,
    isLoading: isLoading && !rawPayload, // Loading uniquement tant que les données dashboard ne sont pas là (plus de blocage settings)
    isValidating,
    mutate,
  }
}
