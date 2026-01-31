import { NextRequest, NextResponse } from 'next/server'


import { prisma } from '@/lib/db'
import { createInvoiceSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}
    
    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { invoiceNo: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    if (status) {
      where.status = status
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { invoiceDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ])

    return NextResponse.json({
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Parse items if it's a JSON string
    if (typeof body.items === 'string') {
      body.items = JSON.parse(body.items)
    }
    
    const validatedData = createInvoiceSchema.parse(body)

    // Generate invoice number
    const year = new Date().getFullYear()
    const existingCount = await prisma.invoice.count({
      where: { invoiceNo: { startsWith: `F${year}-` } }
    })
    const invoiceNo = `F${year}-${String(existingCount + 1).padStart(4, '0')}`

    // Récupérer le taux de TVA par défaut
    const tvaParam = await prisma.parametresEntreprise.findUnique({
      where: { key: 'defaultTvaRate' }
    })
    const tvaRate = tvaParam ? parseFloat(tvaParam.value) : 20

    // Calculate totals
    const totalHt = validatedData.items.reduce((sum, item) => sum + (item.quantity * item.unitPriceHt), 0)
    const totalTva = totalHt * (tvaRate / 100)
    const totalTtc = totalHt + totalTva

    const invoice = await prisma.invoice.create({
      data: {
        clientName: validatedData.clientName,
        clientEmail: validatedData.clientEmail,
        clientAddress: validatedData.clientAddress,
        invoiceDate: new Date(validatedData.invoiceDate),
        dueDate: new Date(validatedData.dueDate),
        status: validatedData.status,
        items: JSON.stringify(validatedData.items),
        notes: validatedData.notes,
        paymentTerms: validatedData.paymentTerms,
        invoiceNo,
        totalHt,
        totalTva,
        totalTtc,
      },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
