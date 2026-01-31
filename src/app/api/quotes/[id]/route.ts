import { NextRequest, NextResponse } from 'next/server'


import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateQuoteSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'converted']).optional(),
  clientEmail: z.string().optional(),
  clientAddress: z.string().optional(),
  notes: z.string().optional(),
  validUntil: z.string().optional()
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const quote = await prisma.quote.findUnique({
      where: { id }
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json({ quote })
  } catch (error) {
    console.error('Erreur lors de la récupération du devis:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du devis' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = updateQuoteSchema.parse(body)

    const updateData: any = { ...validatedData }
    if (validatedData.validUntil) {
      updateData.validUntil = new Date(validatedData.validUntil)
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ quote })
  } catch (error) {
    console.error('Erreur lors de la mise à jour du devis:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du devis' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await prisma.quote.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Devis supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du devis:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du devis' },
      { status: 500 }
    )
  }
}
