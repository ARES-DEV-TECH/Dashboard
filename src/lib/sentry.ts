/**
 * Envoi d’erreurs à Sentry (client uniquement).
 * N’envoie rien si NEXT_PUBLIC_SENTRY_DSN n’est pas défini.
 * Ne pas passer de données sensibles (mots de passe, tokens).
 */
export function captureError(error: unknown): void {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  import('@sentry/nextjs').then((Sentry) => {
    if (error instanceof Error) {
      Sentry.captureException(error)
    } else {
      Sentry.captureMessage(String(error), 'error')
    }
  })
}
