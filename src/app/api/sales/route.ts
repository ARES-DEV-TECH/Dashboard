import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createSaleSchema } from '@/lib/validations'
import { calculateSaleAmounts } from '@/lib/math'
import { getNextInvoiceNumber } from '@/lib/invoice-number'
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

    const userFilter = { userId: user.id }
    const where: Record<string, unknown> = search
      ? {
          AND: [
            userFilter,
            {
              OR: [
                { invoiceNo: { contains: search } },
                { clientName: { contains: search } },
                { serviceName: { contains: search } },
              ],
            },
          ],
        }
      : userFilter

    if (year) {
      where.year = parseInt(year)
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { saleDate: 'desc' },
      }),
      prisma.sale.count({ where }),
    ])

    const responseData = {
      sales,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error) {
    console.error('Error fetching sales:', error)
    return NextResponse.json(
      { message: 'Failed to fetch sales', error: (error as Error).message },
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
    const validatedData = createSaleSchema.parse(body)

    const yearForSeq = new Date(validatedData.saleDate).getFullYear()
    const rawNo = validatedData.invoiceNo?.trim() ?? ''
    const invoiceNo = rawNo
      ? rawNo
      : await getNextInvoiceNumber(prisma, user.id, yearForSeq)

    const existingSale = await prisma.sale.findFirst({
      where: { userId: user.id, invoiceNo },
    })

    if (existingSale) {
      return NextResponse.json(
        { error: 'Une vente avec ce numéro de facture existe déjà' },
        { status: 409 }
      )
    }

    // Parse options and calculate total
    let optionsTotal = 0
    if (validatedData.options) {
      try {
        const options = JSON.parse(validatedData.options)
        optionsTotal = options
          .filter((opt: any) => opt.selected)
          .reduce((sum: number, opt: any) => sum + (opt.priceHt || 0), 0)
      } catch (error) {
        console.error('Error parsing options:', error)
      }
    }

    // Taux TVA de l'utilisateur (en base, pas d'appel fetch côté serveur)
    const tvaParam = await prisma.parametresEntreprise.findFirst({
      where: { userId: user.id, key: 'defaultTvaRate' },
    })
    const tvaRate = tvaParam ? parseFloat(tvaParam.value) : 20

    // Calculate amounts
    const amounts = await calculateSaleAmounts(
      validatedData.quantity,
      validatedData.unitPriceHt,
      optionsTotal,
      tvaRate
    )

    const sale = await prisma.sale.create({
      data: {
        ...validatedData,
        ...amounts,
        saleDate: new Date(validatedData.saleDate),
        year: new Date(validatedData.saleDate).getFullYear(),
        invoiceNo,
        userId: user.id,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        status: validatedData.status || 'paid',
      }
    })

    return NextResponse.json(sale, { status: 201 })
  } catch (error) {
    console.error('Error creating sale:', error)
    
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
        { error: 'Une vente avec ce numéro de facture existe déjà' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
