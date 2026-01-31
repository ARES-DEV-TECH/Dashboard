import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateDashboardKPIs, calculateMonthlyData, calculateServiceDistribution } from '@/lib/math'
import { requireAuth, UserPayload } from '@/lib/auth'

const dashboardCache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_MS = 5 * 60 * 1000

export const GET = requireAuth(async (request: NextRequest, user: UserPayload) => {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
    const range = searchParams.get('range') || 'year'
    const customStartDate = searchParams.get('startDate')
    const customEndDate = searchParams.get('endDate')
    
    const [urssafRow, tvaRow] = await Promise.all([
      prisma.parametresEntreprise.findFirst({ where: { key: 'tauxUrssaf', userId: user.id } }),
      prisma.parametresEntreprise.findFirst({ where: { key: 'defaultTvaRate', userId: user.id } })
    ])
    const tauxUrssaf = urssafRow ? parseFloat(urssafRow.value) : 22
    const tauxTva = tvaRow ? parseFloat(tvaRow.value) : 20

    const cacheKey = `${user.id}-${year}-${range}-${month ?? ''}-${customStartDate || ''}-${customEndDate || ''}-${tauxUrssaf}-${tauxTva}`
    const cached = dashboardCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_MS) {
      return NextResponse.json(cached.data, { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300', 'X-Cache': 'HIT' } })
    }

    let startDate: Date
    let endDate: Date
    
    if (range === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate + 'T00:00:00.000Z')
      endDate = new Date(customEndDate + 'T23:59:59.999Z')
    } else {
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      const currentQuarter = Math.ceil(currentMonth / 3)
      switch (range) {
        case 'month': {
          const targetMonth = month || currentMonth
          startDate = new Date(year, targetMonth - 1, 1)
          endDate = new Date(year, targetMonth, 0)
          break
        }
        case 'quarter': {
          const quarterStartMonth = (currentQuarter - 1) * 3
          startDate = new Date(year, quarterStartMonth, 1)
          endDate = new Date(year, quarterStartMonth + 3, 0)
          break
        }
        default:
          startDate = new Date(year, 0, 1)
          endDate = new Date(year, 11, 31)
          break
      }
    }

    // Fetch all data in parallel for better performance
    const [sales, charges, serviceStats, articles] = await Promise.all([
      // Fetch sales for the date range - utilisateur connecté ou ventes sans userId (historique)
      prisma.sale.findMany({
        where: { 
          OR: [{ userId: user.id }, { userId: null }],
          year: range === 'custom' ? undefined : year,
          saleDate: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          saleDate: true,
          caHt: true,
          totalTtc: true,
          serviceName: true,
          year: true,
        },
        orderBy: { saleDate: 'desc' }, // Optimisé avec index
      }),
      
      // Fetch charges for the date range (including recurring logic) - filtrées par utilisateur
      prisma.charge.findMany({
        where: { 
          userId: user.id,
          OR: [
            // Charges ponctuelles dans la période
            {
              recurring: false,
              year: range === 'custom' ? undefined : year,
              expenseDate: {
                gte: startDate,
                lte: endDate
              }
            },
            // Toutes les charges récurrentes (peu importe l'année)
            {
              recurring: true
            }
          ]
        },
        select: {
          id: true,
          expenseDate: true,
          amount: true,
          linkedService: true,
          recurring: true,
          recurringType: true,
          year: true,
        },
      }),
      
      // Get top services by CA - utilisateur ou ventes sans userId
      prisma.sale.groupBy({
        by: ['serviceName'],
        where: { 
          OR: [{ userId: user.id }, { userId: null }],
          year: range === 'custom' ? undefined : year,
          saleDate: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          caHt: true,
        },
        _count: {
          invoiceNo: true,
        },
        orderBy: {
          _sum: {
            caHt: 'desc',
          },
        },
        take: 5,
      }),
      
      prisma.article.findMany({
        where: { userId: user.id },
        select: { serviceName: true, billingFrequency: true } as { serviceName: true; billingFrequency: true },
      }),
    ])

    type ArticleBilling = { serviceName: string; billingFrequency: string | null }
    const articleBillingMap = new Map(
      (articles as ArticleBilling[]).map(a => [
        a.serviceName,
        a.billingFrequency || 'ponctuel',
      ])
    )
    const periodMultiplier = range === 'year' ? 12 : range === 'quarter' ? 3 : 1
    const effectiveSales = sales.map(sale => {
      const freq = articleBillingMap.get(sale.serviceName) || 'ponctuel'
      const mult = freq === 'mensuel' ? periodMultiplier : 1
      return {
        ...sale,
        caHt: sale.caHt * mult,
        totalTtc: sale.totalTtc * mult,
      }
    })

    // Calculate total charges with recurring logic
    let totalChargesHt = 0
    
    // Add one-time charges for the period
    const oneTimeCharges = charges.filter(charge => !charge.recurring)
    totalChargesHt += oneTimeCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0)
    
    // Add recurring charges with proper calculation
    const recurringCharges = charges.filter(charge => charge.recurring)
    for (const charge of recurringCharges) {
      if (charge.recurringType === 'annuel') {
        // Pour les charges annuelles, vérifier si elles tombent dans la période
        const chargeDate = new Date(charge.expenseDate)
        const chargeYear = chargeDate.getFullYear()
        const chargeMonth = chargeDate.getMonth() + 1 // +1 car getMonth() retourne 0-11
        
        if (range === 'month') {
          // Pour un mois : charge annuelle visible seulement le mois de paiement
          const targetMonth = month || new Date().getMonth() + 1
          if (chargeYear === year && chargeMonth === targetMonth) {
            totalChargesHt += charge.amount || 0
          }
        } else {
          // Pour une année : charge annuelle visible si elle tombe dans l'année
          if (chargeYear === year) {
            totalChargesHt += charge.amount || 0
          }
        }
      } else if (charge.recurringType === 'mensuel') {
        if (range === 'month') {
          // Pour un mois : charge mensuelle × 1
          totalChargesHt += charge.amount || 0
        } else {
          // Pour une année : charge mensuelle × 12
          totalChargesHt += (charge.amount || 0) * 12
        }
      } else {
        // Par défaut, traiter comme annuel
        const chargeDate = new Date(charge.expenseDate)
        const chargeYear = chargeDate.getFullYear()
        if (chargeYear === year) {
          totalChargesHt += charge.amount || 0
        }
      }
    }
    
    // Use the calculated total charges directly for KPIs (effectiveSales = CA avec régularité)
    const kpis = calculateDashboardKPIs(effectiveSales, charges, tauxUrssaf, range === 'custom' ? undefined : year)
    // Override the charges total with the recurring calculation
    kpis.chargesHt = totalChargesHt
    // Recalculate result net with correct charges
    // Chaîne cohérente : Résultat brut = CA − Charges ; Résultat net = Résultat brut − URSSAF ; Marge = Résultat net / CA
    kpis.resultNet = kpis.caHt - kpis.chargesHt
    const prelevementUrssaf = kpis.caHt * (tauxUrssaf / 100)
    kpis.resultAfterUrssaf = kpis.resultNet - prelevementUrssaf
    kpis.averageMargin = kpis.caHt > 0 ? (kpis.resultAfterUrssaf / kpis.caHt) * 100 : 0

    // Calculate monthly data (ventes brutes par mois)
    const monthlyData = calculateMonthlyData(sales, year)

    // Répartition par service (annualisée si période année/trimestre)
    const serviceDistribution = calculateServiceDistribution(
      range === 'month' ? sales : effectiveSales
    )


    const responseData = {
      kpis,
      monthlyData,
      serviceDistribution,
      sales: range === 'custom' ? sales : undefined,
    }
    
    // Mettre en cache les données
    dashboardCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    })
    
           return NextResponse.json(responseData, {
             headers: {
               'Cache-Control': 'public, max-age=120, s-maxage=120', // 2 minutes
               'X-Cache': 'MISS'
             }
           })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
})
