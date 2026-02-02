import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createChargeSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const year = searchParams.get('year')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { userId: user.id }

    if (search) {
      where.OR = [
        { category: { contains: search } },
        { vendor: { contains: search } },
        { description: { contains: search } },
      ]
    }

    if (year) {
      where.year = parseInt(year)
    }

    const [charges, total] = await Promise.all([
      prisma.charge.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          article: true,
        },
      }),
      prisma.charge.count({ where }),
    ])

    return NextResponse.json(
      {
        charges,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      {
        headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' },
      }
    )
  } catch (error) {
    console.error('Error fetching charges:', error)
    return NextResponse.json(
      { message: 'Failed to fetch charges', error: (error as Error).message },
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

    // Convert expenseDate string to Date if needed
    if (body.expenseDate && typeof body.expenseDate === 'string') {
      body.expenseDate = new Date(body.expenseDate)
    }

    const validatedData = createChargeSchema.parse(body)

    // Dériver automatiquement le champ recurring basé sur recurringType
    const chargeData = {
      ...validatedData,
      recurring: validatedData.recurringType === 'mensuel' || validatedData.recurringType === 'annuel',
      userId: user.id,
    }

    // Créer la charge (récurrente ou non)
    const charge = await prisma.charge.create({
      data: chargeData,
      include: {
        article: true,
      },
    })

    return NextResponse.json(charge, { status: 201 })
  } catch (error) {
    console.error('Error creating charge:', error)
    
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
        { error: 'Une charge avec ces données existe déjà' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
