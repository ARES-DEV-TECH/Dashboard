import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { updateArticleSchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ serviceName: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateArticleSchema.parse(body)
    const { serviceName } = await params
    const decodedName = decodeURIComponent(serviceName)

    const existing = await prisma.article.findUnique({
      where: { userId_serviceName: { userId: user.id, serviceName: decodedName } },
      select: { userId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 })
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
      return NextResponse.json(
        { error: 'Aucun champ à mettre à jour' },
        { status: 400 }
      )
    }

    const article = await prisma.article.update({
      where: { userId_serviceName: { userId: user.id, serviceName: decodedName } },
      data: data as Parameters<typeof prisma.article.update>[0]['data'],
    })

    return NextResponse.json(article)
  } catch (error) {
    console.error('Error updating article:', error)
    if (error instanceof ZodError) {
      const first = error.issues[0]
      const message = first ? `${first.path.join('.')}: ${first.message}` : 'Données invalides'
      return NextResponse.json(
        { error: message, details: error.issues },
        { status: 400 }
      )
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Article non trouvé' },
          { status: 404 }
        )
      }
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Un article avec ce nom existe déjà' },
          { status: 409 }
        )
      }
    }
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de l\'article', details: message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ serviceName: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { serviceName } = await params
    const decodedName = decodeURIComponent(serviceName)
    const existing = await prisma.article.findUnique({
      where: { userId_serviceName: { userId: user.id, serviceName: decodedName } },
      select: { userId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Article non trouvé' }, { status: 404 })
    }

    await prisma.article.delete({
      where: { userId_serviceName: { userId: user.id, serviceName: decodedName } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting article:', error)
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Article non trouvé' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    )
  }
}
