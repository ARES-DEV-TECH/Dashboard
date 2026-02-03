import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    // Récupérer le devis
    const quote = await prisma.quote.findUnique({
      where: { id }
    })

    if (!quote) {
      return NextResponse.json(
        { error: 'Devis non trouvé' },
        { status: 404 }
      )
    }

    if (quote.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Le devis doit être accepté avant d\'être converti en facture' },
        { status: 400 }
      )
    }

    // Générer le numéro de facture
    const year = new Date().getFullYear()
    const count = await prisma.invoice.count({
      where: {
        invoiceNo: {
          startsWith: `F${year}`
        }
      }
    })
    const invoiceNo = `F${year}-${String(count + 1).padStart(3, '0')}`

    // Créer la facture
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        quoteId: quote.id,
        clientName: quote.clientName,
        clientEmail: quote.clientEmail,
        clientAddress: quote.clientAddress,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
        items: quote.items,
        notes: quote.notes,
        paymentTerms: 'Paiement à 30 jours net',
        status: 'draft',
        totalHt: quote.totalHt,
        totalTva: quote.totalTva,
        totalTtc: quote.totalTtc
      }
    })

    // Créer les ventes correspondantes
    const items = JSON.parse(quote.items)
    const sales = []

    for (const item of items) {
      // Calculer le prix total avec les options
      let itemTotal = item.quantity * item.unitPriceHt
      
      for (const option of item.options) {
        if (option.selected) {
          itemTotal += option.priceHt
        }
      }

      const ratioTva = quote.totalHt && Number.isFinite(quote.totalHt)
        ? quote.totalTva / quote.totalHt
        : 0
      const tvaAmount = itemTotal * ratioTva
      const totalTtc = itemTotal + tvaAmount

      // Générer le numéro de facture pour la vente
      const saleInvoiceNo = `${invoiceNo}-${item.serviceName.replace(/\s+/g, '').substring(0, 3).toUpperCase()}`

      const sale = await prisma.sale.create({
        data: {
          invoiceNo: saleInvoiceNo,
          saleDate: new Date(),
          clientName: quote.clientName,
          serviceName: item.serviceName,
          quantity: item.quantity,
          unitPriceHt: item.unitPriceHt,
          caHt: itemTotal,
          tvaAmount,
          totalTtc,
          options: JSON.stringify(item.options),
          year: new Date().getFullYear(),
          quoteId: quote.id,
          invoiceId: invoice.id,
          userId: user.id
        }
      })

      sales.push(sale)
    }

    // Marquer le devis comme converti
    await prisma.quote.update({
      where: { id },
      data: { status: 'converted' }
    })

    return NextResponse.json({ 
      invoice, 
      sales,
      message: 'Devis converti en facture avec succès'
    })
  } catch (error) {
    console.error('Erreur lors de la conversion du devis:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la conversion du devis' },
      { status: 500 }
    )
  }
}
