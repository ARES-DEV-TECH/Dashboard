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
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error)
    }
    console.error(error)
  }, [error])

  return (
    <ErrorState
      title="Impossible de charger les clients"
      description="Une erreur est survenue lors de la récupération de la liste des clients."
      retry={reset}
    />
  )
}
