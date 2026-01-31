import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { updateSaleSchema } from '@/lib/validations'
import { calculateSaleAmounts } from '@/lib/math'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceNo: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const raw = (await params).invoiceNo
    const invoiceNo = typeof raw === 'string' ? decodeURIComponent(raw).trim() : ''
    if (!invoiceNo) {
      return NextResponse.json({ error: 'Numéro de facture manquant' }, { status: 400 })
    }

    // Validate first with the schema (expects string)
    const validatedData = updateSaleSchema.parse(body)

    // Then convert saleDate string to Date for Prisma
    const updateData = {
      ...validatedData,
      saleDate: new Date(validatedData.saleDate)
    }

    // Options : total des options sélectionnées
    let optionsTotal = 0
    if (validatedData.options) {
      try {
        const options = JSON.parse(validatedData.options)
        optionsTotal = options
          .filter((opt: { selected?: boolean; priceHt?: number }) => opt.selected)
          .reduce((sum: number, opt: { priceHt?: number }) => sum + (opt.priceHt || 0), 0)
      } catch {
        // ignore
      }
    }

    const existingSale = await prisma.sale.findUnique({
      where: { invoiceNo },
      select: { userId: true },
    })
    if (!existingSale || existingSale.userId !== user.id) {
      return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 })
    }

    // Taux TVA de l'utilisateur (en base)
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

    const sale = await prisma.sale.update({
      where: { invoiceNo },
      data: {
        ...updateData,
        ...amounts,
        year: new Date(validatedData.saleDate).getFullYear(),
      },
    })

    return NextResponse.json({ sale })
  } catch (error) {
    console.error('Error updating sale:', error)
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ message: 'Sale not found' }, { status: 404 })
    }
    return NextResponse.json(
      { message: 'Failed to update sale', error: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceNo: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const raw = (await params).invoiceNo
    const invoiceNo = typeof raw === 'string' ? decodeURIComponent(raw).trim() : ''
    if (!invoiceNo) {
      return NextResponse.json({ error: 'Numéro de facture manquant' }, { status: 400 })
    }
    const existing = await prisma.sale.findUnique({
      where: { invoiceNo },
      select: { userId: true },
    })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 })
    }

    await prisma.sale.delete({
      where: { invoiceNo },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sale:', error)
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json({ message: 'Sale not found' }, { status: 404 })
    }
    return NextResponse.json(
      { message: 'Failed to delete sale', error: (error as Error).message },
      { status: 500 }
    )
  }
}