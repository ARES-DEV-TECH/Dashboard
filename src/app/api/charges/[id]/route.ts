import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { updateChargeSchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = await params

    // Récupérer la charge existante
    const existingCharge = await prisma.charge.findUnique({
      where: { id },
    })

    if (!existingCharge || existingCharge.userId !== user.id) {
      return NextResponse.json({ error: 'Charge non trouvée' }, { status: 404 })
    }
    
    // Pour les mises à jour partielles, on ne met à jour que les champs fournis
    const updateData = {
      ...body,
      // Convert expenseDate string to Date if needed
      expenseDate: body.expenseDate ? 
        (typeof body.expenseDate === 'string' ? new Date(body.expenseDate) : body.expenseDate) :
        undefined
    }
    
    // Filtrer les champs undefined
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )
    
    const validatedData = updateChargeSchema.partial().parse(filteredData)
    
    // Dériver automatiquement le champ recurring basé sur recurringType
    const finalUpdateData = {
      ...validatedData,
      recurring: validatedData.recurringType 
        ? (validatedData.recurringType === 'mensuel' || validatedData.recurringType === 'annuel')
        : undefined
    }

    const charge = await prisma.charge.update({
      where: { id },
      data: finalUpdateData,
      // Relations supprimées pour éviter les erreurs de contraintes
    })

    return NextResponse.json(charge)
  } catch (error) {
    console.error('Error updating charge:', error)
    
    // Handle foreign key constraint violations
    if (error instanceof Error && error.message.includes('Foreign key constraint violated')) {
      return NextResponse.json(
        { message: 'Le service lié n\'existe pas ou a été supprimé' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { message: 'Failed to update charge', error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params
    const existingCharge = await prisma.charge.findUnique({
      where: { id },
    })
    if (!existingCharge || existingCharge.userId !== user.id) {
      return NextResponse.json({ error: 'Charge non trouvée' }, { status: 404 })
    }

    await prisma.charge.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting charge:', error)
    return NextResponse.json(
      { message: 'Failed to delete charge', error: (error as Error).message },
      { status: 500 }
    )
  }
}