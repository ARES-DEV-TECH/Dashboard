import { NextRequest, NextResponse } from 'next/server'


import { prisma } from '@/lib/db'
import { calculateRecurringCharges, getTotalCharges } from '@/lib/recurring-charges'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined

    // Fetch all charges for the year
    const charges = await prisma.charge.findMany({
      where: { year },
      select: {
        id: true,
        expenseDate: true,
        category: true,
        vendor: true,
        description: true,
        amount: true,
        recurring: true,
        paymentMethod: true,
        notes: true,
        linkedService: true,
        year: true,
      },
    })

    // Calculate recurring charges for the specified period
    const calculatedCharges = calculateRecurringCharges(charges, year, month)
    
    // Get totals with breakdown
    const totals = getTotalCharges(charges, year, month)

    return NextResponse.json({
      charges: calculatedCharges,
      totals,
      period: {
        year,
        month,
        label: month ? `${new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}` : `Année ${year}`
      }
    })
  } catch (error) {
    console.error('Error fetching calculated charges:', error)
    return NextResponse.json(
      { message: 'Failed to fetch calculated charges', error: (error as Error).message },
      { status: 500 }
    )
  }
}
