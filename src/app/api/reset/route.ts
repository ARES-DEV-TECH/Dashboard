import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

/**
 * POST /api/reset — Réinitialise toute la base de données (données métier + utilisateurs).
 * Nécessite une authentification. Après reset, l'utilisateur est supprimé ; le front fait un reload → redirection login.
 */
export const POST = requireAuth(async (_request: NextRequest) => {
  try {
    // Ordre de suppression pour respecter les clés étrangères
    await prisma.charge.deleteMany({})
    await prisma.sale.deleteMany({})
    await prisma.serviceOption.deleteMany({})
    await prisma.parametresEntreprise.deleteMany({})
    await prisma.invoice.deleteMany({})
    await prisma.quote.deleteMany({})
    await prisma.client.deleteMany({})
    await prisma.article.deleteMany({})
    await prisma.user.deleteMany({})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting database:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation de la base de données' },
      { status: 500 }
    )
  }
})
