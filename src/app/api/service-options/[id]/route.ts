import { NextRequest, NextResponse } from 'next/server'


import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateServiceOptionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  priceHt: z.number().optional(),
  isDefault: z.boolean().optional()
})

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = updateServiceOptionSchema.parse(body)

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
    const { id } = await params

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
