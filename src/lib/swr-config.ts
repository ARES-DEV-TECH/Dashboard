/**
 * Options SWR partagées pour limiter les appels réseau et garder l’UI fluide.
 * Un seul endroit à modifier pour ajuster la latence / fraîcheur des données.
 */
export const SWR_LIST_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: 10_000, // 10 s
  keepPreviousData: true,
} as const

/** Cache long (dashboard, analytics) : 5 min de déduplication */
export const SWR_CACHE_LONG_OPTIONS = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
  dedupingInterval: 300_000, // 5 min
} as const

/** Options pour revalidation au focus/reconnect (ex. données récentes) */
export const SWR_CACHE_LONG_WITH_REFOCUS = {
  ...SWR_CACHE_LONG_OPTIONS,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5_000,
} as const
