'use client'

import { useEffect } from 'react'
import { ErrorState } from '@/components/ui/error-state'
import * as Sentry from '@sentry/nextjs'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log l'erreur vers Sentry
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error)
    }
    console.error(error)
  }, [error])

  return (
    <ErrorState
      title="Erreur de chargement du tableau de bord"
      description="Impossible d'afficher les indicateurs. Une erreur technique est survenue."
      retry={reset}
    />
  )
}
