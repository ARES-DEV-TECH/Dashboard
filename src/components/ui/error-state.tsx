'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  description?: string
  retry?: () => void
}

export function ErrorState({
  title = "Une erreur est survenue",
  description = "Nous n'avons pas pu charger les données. Veuillez vérifier votre connexion ou réessayer.",
  retry
}: ErrorStateProps) {
  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-[400px]">
          {description}
        </p>
      </div>
      {retry && (
        <Button variant="outline" onClick={retry} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Réessayer
        </Button>
      )}
    </div>
  )
}
