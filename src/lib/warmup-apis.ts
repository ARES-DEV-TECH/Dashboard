'use client'

import { calculatePresetDates, buildApiParams } from '@/lib/date-utils'
import { SWR_KEYS, fetchClients, fetchArticles, fetchSales, fetchCharges, fetchSettings } from '@/lib/swr-fetchers'
import { dashboardFetcher } from '@/app/(main)/dashboard/use-dashboard-data'
import type { ScopedMutator } from 'swr'

/**
 * Préremplit le cache SWR de manière optimisée (séquentielle/étalée)
 * pour ne pas geler l'interface au moment de la transition.
 */
export function preloadSwrCache(mutate: ScopedMutator): void {
  const range = calculatePresetDates('thisMonth')
  const params = buildApiParams(range)
  const year = range.start.getFullYear()
  const dashboardKey = `dashboard-${params}::${year}`

  // 1. Priorité absolue : Dashboard (c'est la page d'atterrissage)
  mutate(dashboardKey, dashboardFetcher(dashboardKey)).catch(() => {})

  // 2. Différer les données secondaires pour laisser le UI respirer
  setTimeout(() => {
    // Paramètres légers
    mutate(SWR_KEYS.settings, fetchSettings()).catch(() => {})
    
    // Données métier plus lourdes (séquentiel pour éviter surcharge DB/Network)
    fetchClients().then(data => mutate(SWR_KEYS.clients, data)).catch(() => {})
    
    setTimeout(() => {
        fetchSales().then(data => mutate(SWR_KEYS.sales, data)).catch(() => {})
    }, 200)

    setTimeout(() => {
        fetchArticles().then(data => mutate(SWR_KEYS.articles, data)).catch(() => {})
        fetchCharges().then(data => mutate(SWR_KEYS.charges, data)).catch(() => {})
    }, 400)

  }, 100)
}
