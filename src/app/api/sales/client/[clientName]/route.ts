import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientName: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { clientName } = await params
    const decodedClientName = decodeURIComponent(clientName)

    const sales = await prisma.sale.findMany({
      where: {
        userId: user.id,
        clientName: decodedClientName,
        quoteId: null, // Only sales not linked to a quote yet
      },
      orderBy: {
        saleDate: 'desc',
      },
    })

    return NextResponse.json(sales)
  } catch (error) {
    console.error('Error fetching client sales:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client sales' },
      { status: 500 }
    )
  }
}
