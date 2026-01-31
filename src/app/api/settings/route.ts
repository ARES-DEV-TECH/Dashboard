import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const parameters = await prisma.parametresEntreprise.findMany({
      where: { userId: user.id },
      orderBy: { key: 'asc' },
    })

    return NextResponse.json({ parameters })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { message: 'Failed to fetch settings', error: (error as Error).message },
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
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json({ message: 'Key and value are required' }, { status: 400 })
    }

    const parameter = await prisma.parametresEntreprise.upsert({
      where: { key },
      update: { value },
      create: { key, value, userId: user.id },
    })

    // Le cache sera invalidé automatiquement lors de la prochaine requête
    if (key === 'tauxUrssaf' || key === 'defaultTvaRate') {
      // Synchroniser les ventes si on change le taux de TVA
      if (key === 'defaultTvaRate') {
        try {
          const newTvaRate = parseFloat(value)

          // Récupérer uniquement les ventes de l'utilisateur connecté
          const sales = await prisma.sale.findMany({
            where: { userId: user.id },
            select: {
              invoiceNo: true,
              caHt: true,
              tvaAmount: true,
              totalTtc: true
            }
          })
          
          let updatedCount = 0
          
          // Mettre à jour chaque vente
          for (const sale of sales) {
            const expectedTvaAmount = sale.caHt * (newTvaRate / 100)
            const expectedTotalTtc = sale.caHt + expectedTvaAmount
            
            const tvaDifference = Math.abs(sale.tvaAmount - expectedTvaAmount)
            const totalDifference = Math.abs(sale.totalTtc - expectedTotalTtc)
            
            if (tvaDifference > 0.01 || totalDifference > 0.01) {
              await prisma.sale.update({
                where: { invoiceNo: sale.invoiceNo },
                data: {
                  tvaAmount: expectedTvaAmount,
                  totalTtc: expectedTotalTtc
                }
              })
              updatedCount++
            }
          }
        } catch (error) {
          console.error('Erreur lors de la synchronisation des ventes:', error)
        }
      }
    }

    return NextResponse.json(parameter)
  } catch (error) {
    console.error('Error updating setting:', error)
    const message = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du paramètre', message },
      { status: 500 }
    )
  }
}
