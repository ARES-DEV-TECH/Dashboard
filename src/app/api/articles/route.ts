import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createArticleSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const articles = await prisma.article.findMany({
      where: { userId: user.id },
      orderBy: { serviceName: 'asc' },
    })
    return NextResponse.json(articles, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=30' },
    })
  } catch (findManyError) {
    const msg = findManyError instanceof Error ? findManyError.message : 'Unknown error'
    console.error('Error fetching articles (findMany):', findManyError)
    try {
      const user = await getCurrentUser(request)
      if (!user) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
      }
      const raw = await prisma.$queryRaw<
        Array<{ serviceName: string; priceHt: number; billByHour: boolean; type: string | null; description: string | null; createdAt: Date; updatedAt: Date; userId: string }>
      >(Prisma.sql`SELECT "serviceName", "priceHt", "billByHour", "type", "description", "createdAt", "updatedAt", "userId" FROM articles WHERE "userId" = ${user.id} ORDER BY "serviceName" ASC`)
      return NextResponse.json(raw, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=30' },
      })
    } catch (rawError) {
      console.error('Error fetching articles (raw):', rawError)
      return NextResponse.json(
        { error: 'Failed to fetch articles', details: msg },
        { status: 500 }
      )
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const body = await request.json()
    const validatedData = createArticleSchema.parse(body)

    const existingArticle = await prisma.article.findFirst({
      where: { userId: user.id, serviceName: validatedData.serviceName },
    })

    if (existingArticle) {
      return NextResponse.json(
        { error: 'Un article avec ce nom existe déjà' },
        { status: 409 }
      )
    }

    const article = await prisma.article.create({
      data: { ...validatedData, userId: user.id },
    })

    return NextResponse.json(article, { status: 201 })
  } catch (error) {
    console.error('Error creating article:', error)
    
    // Gestion des erreurs de validation Zod
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: error.issues.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    // Gestion des erreurs de contrainte unique Prisma
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Un article avec ce nom existe déjà' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
