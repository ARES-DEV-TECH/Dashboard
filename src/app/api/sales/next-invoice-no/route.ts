import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getNextInvoiceNumber } from '@/lib/invoice-number'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const yearParam = searchParams.get('year')
    const yearNum: number | undefined = yearParam ? parseInt(yearParam, 10) : undefined
    if (
      yearParam &&
      (typeof yearNum !== 'number' || Number.isNaN(yearNum) || yearNum < 2020 || yearNum > 2030)
    ) {
      return NextResponse.json({ error: 'Année invalide' }, { status: 400 })
    }

    const nextInvoiceNo = await getNextInvoiceNumber(prisma, user.id, yearNum)
    return NextResponse.json({ nextInvoiceNo })
  } catch (error) {
    console.error('Error fetching next invoice number:', error)
    return NextResponse.json(
      { message: 'Erreur serveur', error: (error as Error).message },
      { status: 500 }
    )
  }
}
