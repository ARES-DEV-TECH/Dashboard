'use client'

/**
 * Lance en arrière-plan les appels vers les API principales pour :
 * - déclencher la compilation des routes Next.js (mode dev)
 * - réduire la latence au premier clic sur Dashboard, Clients, etc.
 * Ne bloque pas : à appeler sans await après connexion.
 */
import { electronFetch } from '@/lib/electron-api'
import { calculatePresetDates, buildApiParams } from '@/lib/date-utils'
import { SWR_KEYS, fetchClients, fetchArticles, fetchSales, fetchCharges, fetchSettings } from '@/lib/swr-fetchers'
import { dashboardFetcher } from '@/app/dashboard/use-dashboard-data'
import type { ScopedMutator } from 'swr'

export function warmupApis(): void {
  const range = calculatePresetDates('thisMonth')
  const params = buildApiParams(range)
  const year = range.start.getFullYear()

  const urls: string[] = [
    `/api/dashboard?${params}`,
    `/api/charges/breakdown?${params}`,
    `/api/dashboard/evolution?year=${year}`,
    '/api/settings',
    '/api/clients',
    '/api/articles',
    '/api/sales',
    '/api/charges?limit=500',
  ]

  Promise.allSettled(urls.map((path) => electronFetch(path))).catch(() => {
    // Ignorer les erreurs (ex. 401 si session pas encore propagée)
  })
}

/**
 * Préremplit le cache SWR avec les données des pages principales.
 * Après connexion, le Dashboard / Clients / etc. affichent les données immédiatement (prod + dev).
 */
export function preloadSwrCache(mutate: ScopedMutator): void {
  const range = calculatePresetDates('thisMonth')
  const params = buildApiParams(range)
  const year = range.start.getFullYear()
  const dashboardKey = `dashboard-${params}::${year}`

  mutate(SWR_KEYS.clients, fetchClients()).catch(() => {})
  mutate(SWR_KEYS.articles, fetchArticles()).catch(() => {})
  mutate(SWR_KEYS.sales, fetchSales()).catch(() => {})
  mutate(SWR_KEYS.charges, fetchCharges()).catch(() => {})
  mutate(SWR_KEYS.settings, fetchSettings()).catch(() => {})
  mutate(dashboardKey, dashboardFetcher(dashboardKey)).catch(() => {})
}
