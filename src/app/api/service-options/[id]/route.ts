import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const updateServiceOptionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  priceHt: z.number().optional(),
  isDefault: z.boolean().optional()
})

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json()
    const validatedData = updateServiceOptionSchema.parse(body)

    const existing = await prisma.serviceOption.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Option non trouvée' }, { status: 404 })
    }

    const option = await prisma.serviceOption.update({
      where: { id },
      data: validatedData
    })

    return NextResponse.json({ option })
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'option:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'option' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const { id } = await params

    const existing = await prisma.serviceOption.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Option non trouvée' }, { status: 404 })
    }

    await prisma.serviceOption.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Option supprimée avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'option:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'option' },
      { status: 500 }
    )
  }
}
