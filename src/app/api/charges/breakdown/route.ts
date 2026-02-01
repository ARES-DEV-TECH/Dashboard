import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const range = searchParams.get('range') || 'year'
    const customStartDate = searchParams.get('startDate')
    const customEndDate = searchParams.get('endDate')
    
    // Calculate date range based on the range parameter
    let startDate: Date
    let endDate: Date
    
    if (range === 'custom' && customStartDate && customEndDate) {
      // Custom date range
      startDate = new Date(customStartDate)
      endDate = new Date(customEndDate)
    } else {
      // Predefined ranges
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1 // 1-12
      const currentQuarter = Math.ceil(currentMonth / 3) // 1-4
      
      switch (range) {
        case 'month':
          // Current month
          startDate = new Date(year, currentMonth - 1, 1)
          endDate = new Date(year, currentMonth, 0)
          break
        case 'quarter':
          // Current quarter
          const quarterStartMonth = (currentQuarter - 1) * 3
          startDate = new Date(year, quarterStartMonth, 1)
          endDate = new Date(year, quarterStartMonth + 3, 0)
          break
        default: // 'year'
          // Full year
          startDate = new Date(year, 0, 1)
          endDate = new Date(year, 11, 31)
          break
      }
    }

    // Get charges directly from database
    // Pour les charges récurrentes, on les récupère toutes (peu importe la date)
    // Pour les charges ponctuelles, on les filtre par date
    const [recurringCharges, oneTimeCharges] = await Promise.all([
      // Récupérer toutes les charges récurrentes (filtrées par utilisateur)
      prisma.charge.findMany({
        where: {
          userId: user.id,
          recurring: true
        },
        select: {
          id: true,
          expenseDate: true,
          category: true,
          vendor: true,
          description: true,
          amount: true,
          recurring: true,
          recurringType: true,
          linkedService: true,
          linkedClient: true,
          linkedSaleId: true,
          year: true
        }
      }),
      // Récupérer les charges ponctuelles dans la période (filtrées par utilisateur)
      prisma.charge.findMany({
        where: {
          userId: user.id,
          year,
          recurring: false,
          expenseDate: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          id: true,
          expenseDate: true,
          category: true,
          vendor: true,
          description: true,
          amount: true,
          recurring: true,
          recurringType: true,
          linkedService: true,
          linkedClient: true,
          linkedSaleId: true,
          year: true
        }
      })
    ])
    
    // Combiner les charges
    const charges = [...recurringCharges, ...oneTimeCharges]

    // Calculate total charges with proper recurring multiplication based on period
    let totalRecurring = 0
    let totalOneTime = 0
    
    // Calculer le nombre de mois dans la période de façon précise
    const startYear = startDate.getFullYear()
    const startMonth = startDate.getMonth()
    const endYear = endDate.getFullYear()
    const endMonth = endDate.getMonth()
    
    const periodMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1
    
    charges.forEach(charge => {
      const amount = charge.amount || 0
      
      if (charge.recurring) {
        // Démultiplier les charges récurrentes selon leur type ET la période
        let multiplier = 1
        
        if (charge.recurringType === 'mensuel') {
          // Pour les charges mensuelles, multiplier par le nombre de mois dans la période
          multiplier = Math.max(1, periodMonths)
        } else if (charge.recurringType === 'annuel') {
          // Pour les charges annuelles, vérifier si elles tombent dans la période exacte
          const chargeDate = new Date(charge.expenseDate)
          const chargeYear = chargeDate.getFullYear()
          const chargeMonth = chargeDate.getMonth() + 1 // +1 car getMonth() retourne 0-11
          
          // Vérifier si la charge annuelle tombe dans la période exacte
          if (chargeYear >= startDate.getFullYear() && chargeYear <= endDate.getFullYear()) {
            // Si c'est une période mensuelle, vérifier le mois exact
            if (periodMonths === 1) {
              const targetMonth = startDate.getMonth() + 1
              if (chargeMonth === targetMonth) {
                multiplier = 1
              } else {
                multiplier = 0
              }
            } else {
              // Pour une période annuelle, inclure toutes les charges de l'année
              multiplier = 1
            }
          } else {
            multiplier = 0 // Pas dans la période
          }
        } else {
          // Par défaut, supposer annuel si pas spécifié
          const chargeDate = new Date(charge.expenseDate)
          const chargeYear = chargeDate.getFullYear()
          
          if (chargeYear >= startDate.getFullYear() && chargeYear <= endDate.getFullYear()) {
            multiplier = 1 // Une fois par année dans la période
          } else {
            multiplier = 0 // Pas dans la période
          }
        }
        
        totalRecurring += amount * multiplier
      } else {
        totalOneTime += amount
      }
    })
    
    const totalCharges = {
      totalHt: totalRecurring + totalOneTime,
      totalTtc: totalRecurring + totalOneTime,
      breakdown: {
        recurring: totalRecurring,
        oneTime: totalOneTime
      }
    }

    // Group charges by category
    const chargesByCategory = charges.reduce((acc, charge) => {
      const category = charge.category || 'Non classé'
      if (!acc[category]) {
        acc[category] = {
          category,
          recurring: 0,
          oneTime: 0,
          vendors: new Set(),
          count: 0
        }
      }
      
      acc[category].count++
      acc[category].vendors.add(charge.vendor || 'Inconnu')
      
      if (charge.recurring) {
        // Démultiplier les charges récurrentes selon leur type ET la période
        let multiplier = 1
        
        if (charge.recurringType === 'mensuel') {
          // Pour les charges mensuelles, multiplier par le nombre de mois dans la période
          multiplier = Math.max(1, periodMonths)
        } else if (charge.recurringType === 'annuel') {
          // Pour les charges annuelles, calculer si elles tombent dans la période
          const chargeDate = new Date(charge.expenseDate)
          const chargeYear = chargeDate.getFullYear()
          
          // Vérifier si la charge annuelle tombe dans la période
          if (chargeYear >= startDate.getFullYear() && chargeYear <= endDate.getFullYear()) {
            multiplier = 1 // Une fois par année dans la période
          } else {
            multiplier = 0 // Pas dans la période
          }
        } else {
          // Par défaut, supposer mensuel si pas spécifié
          // ET compter toutes les charges récurrentes comme mensuelles
          multiplier = Math.max(1, periodMonths)
        }
        
        acc[category].recurring += (charge.amount || 0) * multiplier
      } else {
        acc[category].oneTime += charge.amount || 0
      }
      
      return acc
    }, {} as Record<string, {
      category: string
      recurring: number
      oneTime: number
      vendors: Set<string>
      count: number
    }>)

    // Convert to array and calculate totals
    const breakdown = Object.values(chargesByCategory).map(item => ({
      category: item.category,
      recurring: item.recurring,
      oneTime: item.oneTime,
      total: item.recurring + item.oneTime,
      vendors: Array.from(item.vendors),
      count: item.count
    }))

    // Calculate recurring totals
    const recurringBreakdown = breakdown.map(item => ({
      ...item,
      recurringTotal: item.recurring, // Pas de multiplication car amount est déjà le montant total
      calculatedTotal: item.recurring + item.oneTime
    }))

    return NextResponse.json(
      {
        totalHt: totalCharges.totalHt,
        totalTtc: totalCharges.totalTtc,
        breakdown: recurringBreakdown,
        totals: {
          totalHt: totalCharges.totalHt,
          totalTtc: totalCharges.totalTtc,
          breakdown: totalCharges.breakdown
        },
        summary: {
          totalCategories: breakdown.length,
          totalVendors: new Set(charges.map(c => c.vendor).filter(Boolean)).size,
          averageChargePerCategory: breakdown.length > 0
            ? breakdown.reduce((sum, item) => sum + item.total, 0) / breakdown.length
            : 0
        }
      },
      { headers: { 'Cache-Control': 'private, max-age=60' } }
    )
  } catch (error) {
    console.error('Error fetching charges breakdown:', error)
    return NextResponse.json(
      { message: 'Failed to fetch charges breakdown', error: (error as Error).message },
      { status: 500 }
    )
  }
}
