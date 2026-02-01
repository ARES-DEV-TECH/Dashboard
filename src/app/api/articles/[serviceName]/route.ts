import { NextRequest } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db'
import { requireAuth, zodErrorResponse, apiError } from '@/lib/api-utils'
import { updateArticleSchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ serviceName: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request)
  if (authResponse) return authResponse

  try {
    const body = await request.json()
    const validatedData = updateArticleSchema.parse(body)
    const { serviceName } = await params
    const decodedName = decodeURIComponent(serviceName)

    const existing = await prisma.article.findUnique({
      where: { userId_serviceName: { userId: user.id, serviceName: decodedName } },
      select: { userId: true },
    })
    if (!existing) {
      return apiError('Article non trouvé', 404)
    }

    // Ne passer que les champs scalaires Article (pas de relations)
    const data: Record<string, unknown> = {}
    if (validatedData.serviceName != null) data.serviceName = validatedData.serviceName
    if (validatedData.priceHt != null) data.priceHt = validatedData.priceHt
    if (validatedData.billByHour != null) data.billByHour = validatedData.billByHour
    if (validatedData.billingFrequency !== undefined) data.billingFrequency = validatedData.billingFrequency ?? null
    if (validatedData.type !== undefined) data.type = validatedData.type ?? null
    if (validatedData.description !== undefined) data.description = validatedData.description ?? null

    if (Object.keys(data).length === 0) {
      return apiError('Aucun champ à mettre à jour', 400)
    }

    const article = await prisma.article.update({
      where: { userId_serviceName: { userId: user.id, serviceName: decodedName } },
      data: data as Parameters<typeof prisma.article.update>[0]['data'],
    })

    return Response.json(article)
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') return apiError('Article non trouvé', 404)
      if (error.code === 'P2002') return apiError('Un article avec ce nom existe déjà', 409)
    }
    return apiError(error instanceof Error ? error.message : 'Erreur lors de la mise à jour de l\'article', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serviceName: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request)
  if (authResponse) return authResponse

  try {
    const { serviceName } = await params
    const decodedName = decodeURIComponent(serviceName)
    const existing = await prisma.article.findUnique({
      where: { userId_serviceName: { userId: user.id, serviceName: decodedName } },
      select: { userId: true },
    })
    if (!existing) {
      return apiError('Article non trouvé', 404)
    }

    await prisma.article.delete({
      where: { userId_serviceName: { userId: user.id, serviceName: decodedName } },
    })

    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return apiError('Article non trouvé', 404)
    }
    return apiError('Erreur lors de la suppression de l\'article', 500)
  }
}
