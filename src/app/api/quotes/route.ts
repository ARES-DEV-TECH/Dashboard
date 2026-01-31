import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { z } from 'zod'

const quoteItemSchema = z.object({
  serviceName: z.string(),
  quantity: z.number().default(1),
  unitPriceHt: z.number(),
  options: z.array(z.object({
    id: z.string(),
    name: z.string(),
    priceHt: z.number(),
    selected: z.boolean()
  })).default([])
})

const createQuoteSchema = z.object({
  clientName: z.string(),
  clientEmail: z.string().optional(),
  clientAddress: z.string().optional(),
  items: z.array(quoteItemSchema),
  notes: z.string().optional(),
  validUntil: z.string().transform(str => new Date(str))
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientName = searchParams.get('clientName')

    const where: any = {}
    if (status) where.status = status
    if (clientName) where.clientName = clientName

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ quotes })
  } catch (error) {
    console.error('Erreur lors de la récupération des devis:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des devis' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createQuoteSchema.parse(body)

    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    // Vérifier que le client existe (pour cet utilisateur)
    const client = await prisma.client.findFirst({
      where: { userId: user.id, clientName: validatedData.clientName }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      )
    }

    // Calculer les totaux
    let totalHt = 0
    let totalTva = 0
    let totalTtc = 0

    for (const item of validatedData.items) {
      let itemTotal = item.quantity * item.unitPriceHt
      
      // Ajouter les options sélectionnées
      for (const option of item.options) {
        if (option.selected) {
          itemTotal += option.priceHt
        }
      }
      
      totalHt += itemTotal
    }

    // Récupérer le taux de TVA par défaut (paramètre de l'utilisateur connecté)
    const tvaParam = await prisma.parametresEntreprise.findFirst({
      where: { userId: user.id, key: 'defaultTvaRate' }
    })
    const tvaRate = tvaParam ? parseFloat(tvaParam.value) : 20
    
    totalTva = totalHt * (tvaRate / 100)
    totalTtc = totalHt + totalTva

    // Générer le numéro de devis
    const year = new Date().getFullYear()
    const count = await prisma.quote.count({
      where: {
        quoteNo: {
          startsWith: `D${year}`
        }
      }
    })
    const quoteNo = `D${year}-${String(count + 1).padStart(3, '0')}`

    const quote = await prisma.quote.create({
      data: {
        quoteNo,
        clientName: validatedData.clientName,
        clientEmail: validatedData.clientEmail,
        clientAddress: validatedData.clientAddress,
        quoteDate: new Date(),
        validUntil: validatedData.validUntil,
        items: JSON.stringify(validatedData.items),
        notes: validatedData.notes,
        status: 'draft',
        totalHt,
        totalTva,
        totalTtc
      },
    })

    return NextResponse.json({ quote }, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du devis:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Erreur lors de la création du devis' },
      { status: 500 }
    )
  }
}