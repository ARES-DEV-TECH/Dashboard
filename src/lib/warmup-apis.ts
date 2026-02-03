'use client'

import { calculatePresetDates, buildApiParams } from '@/lib/date-utils'
import { SWR_KEYS, fetchSettings } from '@/lib/swr-fetchers'
import { dashboardFetcher } from '@/app/(main)/dashboard/use-dashboard-data'
import type { ScopedMutator } from 'swr'

/**
 * Préremplit uniquement le cache nécessaire à la page d’atterrissage (dashboard + paramètres).
 * Les listes (clients, ventes, articles, charges) sont chargées à la première visite de chaque page,
 * ce qui réduit la latence au login et garde l’UI fluide.
 */
export function preloadSwrCache(mutate: ScopedMutator): void {
  const range = calculatePresetDates('thisMonth')
  const params = buildApiParams(range)
  const year = range.start.getFullYear()
  const dashboardKey = `dashboard-${params}::${year}`

  mutate(dashboardKey, dashboardFetcher(dashboardKey)).catch(() => {})
  mutate(SWR_KEYS.settings, fetchSettings()).catch(() => {})
}
