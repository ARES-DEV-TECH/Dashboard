import { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { prisma } from '@/lib/db'
import { requireAuth, zodErrorResponse, apiError } from '@/lib/api-utils'
import { updateChargeSchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request)
  if (authResponse) return authResponse

  try {
    const body = await request.json()
    const { id } = await params

    // Récupérer la charge existante
    const existingCharge = await prisma.charge.findUnique({
      where: { id },
    })

    if (!existingCharge || existingCharge.userId !== user.id) {
      return apiError('Charge non trouvée', 404)
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

    return Response.json(charge)
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error)
    if (error instanceof Error && error.message.includes('Foreign key constraint violated')) {
      return apiError('Le service lié n\'existe pas ou a été supprimé', 400)
    }
    return apiError(error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la charge', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request)
  if (authResponse) return authResponse

  try {
    const { id } = await params
    const existingCharge = await prisma.charge.findUnique({
      where: { id },
    })
    if (!existingCharge || existingCharge.userId !== user.id) {
      return apiError('Charge non trouvée', 404)
    }

    await prisma.charge.delete({
      where: { id },
    })

    return Response.json({ success: true })
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erreur lors de la suppression de la charge', 500)
  }
}