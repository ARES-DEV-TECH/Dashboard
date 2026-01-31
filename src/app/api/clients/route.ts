import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createClientSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const clients = await prisma.client.findMany({
      where: { userId: user.id },
      orderBy: { clientName: 'asc' },
    })
    return NextResponse.json(clients, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=30' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients', details: message },
      { status: 500 }
    )
  }
}

function buildClientName(firstName: string, lastName: string): string {
  return [firstName, lastName].map((s) => s?.trim()).filter(Boolean).join(' ').trim()
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createClientSchema.parse(body)
    const clientName = buildClientName(validatedData.firstName, validatedData.lastName)
    if (!clientName) {
      return NextResponse.json(
        { error: 'Prénom et nom sont requis' },
        { status: 400 }
      )
    }

    const existingClient = await prisma.client.findFirst({
      where: { userId: user.id, clientName },
    })

    if (existingClient) {
      return NextResponse.json(
        { error: 'Un client avec ce nom existe déjà' },
        { status: 409 }
      )
    }

    const client = await prisma.client.create({
      data: {
        userId: user.id,
        clientName,
        firstName: validatedData.firstName.trim(),
        lastName: validatedData.lastName.trim(),
        email: validatedData.email || undefined,
        phone: validatedData.phone,
        website: validatedData.website,
        company: validatedData.company,
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Error creating client:', error)
    
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
        { error: 'Un client avec ce nom existe déjà' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
