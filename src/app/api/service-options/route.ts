import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const serviceOptionSchema = z.object({
  serviceName: z.string(),
  name: z.string(),
  description: z.string().optional(),
  priceHt: z.number().default(0),
  isDefault: z.boolean().default(false)
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const serviceName = searchParams.get('serviceName')

    if (serviceName) {
      const article = await prisma.article.findUnique({
        where: { serviceName },
        select: { userId: true },
      })
      if (!article || article.userId !== user.id) {
        return NextResponse.json({ options: [] })
      }
    }

    const articleServiceNames = serviceName
      ? [serviceName]
      : (await prisma.article.findMany({
          where: { userId: user.id },
          select: { serviceName: true },
        })).map((a) => a.serviceName)

    const options = await prisma.serviceOption.findMany({
      where: { serviceName: { in: articleServiceNames } },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ options })
  } catch (error) {
    console.error('Erreur lors de la récupération des options:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des options' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = serviceOptionSchema.parse(body)

    const service = await prisma.article.findUnique({
      where: { serviceName: validatedData.serviceName },
      select: { userId: true },
    })
    if (!service || service.userId !== user.id) {
      return NextResponse.json(
        { error: 'Service non trouvé' },
        { status: 404 }
      )
    }

    const option = await prisma.serviceOption.create({
      data: {
        serviceName: validatedData.serviceName,
        name: validatedData.name,
        description: validatedData.description,
        priceHt: validatedData.priceHt,
        isDefault: validatedData.isDefault
      }
    })

    return NextResponse.json({ option }, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de l\'option:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'option' },
      { status: 500 }
    )
  }
}
