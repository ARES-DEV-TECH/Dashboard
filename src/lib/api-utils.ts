import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { getCurrentUser } from '@/lib/auth'

/** Retourne l'utilisateur connecté ou une réponse 401. */
export async function requireAuth(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }) }
  }
  return { user, response: null }
}

/** Réponse 400 pour erreur de validation Zod. */
export function zodErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: 'Données invalides',
      details: error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    },
    { status: 400 }
  )
}

/** Réponse 409 pour conflit (ex. contrainte unique). */
export function conflictResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 409 })
}

/** Réponse d'erreur API générique. */
export function apiError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}
