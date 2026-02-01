import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
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

    const periodMultiplier = range === 'year' ? 12 : range === 'quarter' ? 3 : 1

    // Agrégation SQL : totaux et répartitions en BDD (SUM/GROUP BY), sans charger toutes les lignes
    const [salesAgg, monthlyAgg, serviceAgg, charges, salesForCustom] = await Promise.all([
      prisma.$queryRaw<[{ totalCaHt: number; totalTtc: number }]>(
        Prisma.sql`
          SELECT
            COALESCE(SUM(s."caHt" * CASE WHEN a."billingFrequency" = 'mensuel' THEN ${periodMultiplier} ELSE 1 END), 0)::double precision AS "totalCaHt",
            COALESCE(SUM(s."totalTtc" * CASE WHEN a."billingFrequency" = 'mensuel' THEN ${periodMultiplier} ELSE 1 END), 0)::double precision AS "totalTtc"
          FROM sales s
          LEFT JOIN articles a ON a."userId" = s."userId" AND a."serviceName" = s."serviceName"
          WHERE s."userId" = ${user.id} AND s."saleDate" >= ${startDate} AND s."saleDate" <= ${endDate}
        `
      ),
      prisma.$queryRaw<Array<{ month: number; caHt: number; totalTtc: number }>>(
        Prisma.sql`
          SELECT
            EXTRACT(MONTH FROM s."saleDate")::int AS month,
            COALESCE(SUM(s."caHt" * CASE WHEN a."billingFrequency" = 'mensuel' THEN ${periodMultiplier} ELSE 1 END), 0)::double precision AS "caHt",
            COALESCE(SUM(s."totalTtc" * CASE WHEN a."billingFrequency" = 'mensuel' THEN ${periodMultiplier} ELSE 1 END), 0)::double precision AS "totalTtc"
          FROM sales s
          LEFT JOIN articles a ON a."userId" = s."userId" AND a."serviceName" = s."serviceName"
          WHERE s."userId" = ${user.id} AND s."saleDate" >= ${startDate} AND s."saleDate" <= ${endDate}
          GROUP BY EXTRACT(MONTH FROM s."saleDate")
        `
      ),
      prisma.$queryRaw<Array<{ serviceName: string; caHt: number }>>(
        Prisma.sql`
          SELECT
            s."serviceName",
            COALESCE(SUM(s."caHt" * CASE WHEN a."billingFrequency" = 'mensuel' THEN ${periodMultiplier} ELSE 1 END), 0)::double precision AS "caHt"
          FROM sales s
          LEFT JOIN articles a ON a."userId" = s."userId" AND a."serviceName" = s."serviceName"
          WHERE s."userId" = ${user.id} AND s."saleDate" >= ${startDate} AND s."saleDate" <= ${endDate}
          GROUP BY s."serviceName"
          ORDER BY "caHt" DESC
        `
      ),
      prisma.charge.findMany({
        where: {
          userId: user.id,
          OR: [
            {
              recurring: false,
              year: range === 'custom' ? undefined : year,
              expenseDate: { gte: startDate, lte: endDate },
            },
            { recurring: true },
          ],
        },
        select: {
          id: true,
          expenseDate: true,
          amount: true,
          recurring: true,
          recurringType: true,
          year: true,
        },
      }),
      range === 'custom'
        ? prisma.sale.findMany({
            where: {
              userId: user.id,
              saleDate: { gte: startDate, lte: endDate },
            },
            select: {
              saleDate: true,
              caHt: true,
              totalTtc: true,
              serviceName: true,
              year: true,
            },
            orderBy: { saleDate: 'desc' },
          })
        : Promise.resolve([]),
    ])

    const totalCaHt = Number(salesAgg[0]?.totalCaHt ?? 0)
    const totalTtc = Number(salesAgg[0]?.totalTtc ?? 0)

    // Charges : total avec logique récurrente (inchangée)
    let totalChargesHt = 0
    const oneTimeCharges = charges.filter(c => !c.recurring)
    totalChargesHt += oneTimeCharges.reduce((sum, c) => sum + (c.amount || 0), 0)
    const recurringCharges = charges.filter(c => c.recurring)
    for (const charge of recurringCharges) {
      const chargeDate = new Date(charge.expenseDate)
      const chargeYear = chargeDate.getFullYear()
      const chargeMonth = chargeDate.getMonth() + 1
      if (charge.recurringType === 'annuel') {
        if (range === 'month') {
          const targetMonth = month ?? new Date().getMonth() + 1
          if (chargeYear === year && chargeMonth === targetMonth) totalChargesHt += charge.amount || 0
        } else {
          if (chargeYear === year) totalChargesHt += charge.amount || 0
        }
      } else if (charge.recurringType === 'mensuel') {
        if (range === 'month') totalChargesHt += charge.amount || 0
        else totalChargesHt += (charge.amount || 0) * 12
      } else {
        if (chargeYear === year) totalChargesHt += charge.amount || 0
      }
    }

    const resultNet = totalCaHt - totalChargesHt
    const prelevementUrssaf = totalCaHt * (tauxUrssaf / 100)
    const resultAfterUrssaf = resultNet - prelevementUrssaf
    const kpis = {
      caHt: totalCaHt,
      caTtc: totalTtc,
      chargesHt: totalChargesHt,
      resultNet,
      resultAfterUrssaf,
      averageMargin: totalCaHt > 0 ? (resultAfterUrssaf / totalCaHt) * 100 : 0,
    }

    const monthMap = new Map(monthlyAgg.map(row => [row.month, { caHt: Number(row.caHt), caTtc: Number(row.totalTtc) }]))
    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(year, i).toLocaleDateString('fr-FR', { month: 'short' }),
      caHt: monthMap.get(i + 1)?.caHt ?? 0,
      caTtc: monthMap.get(i + 1)?.caTtc ?? 0,
    }))

    // PostgreSQL / Prisma peut renvoyer les colonnes en minuscules (servicename, caht)
    const serviceDistribution = serviceAgg.map((row: { serviceName?: string; servicename?: string; caHt?: number; caht?: number }) => ({
      name: String(row.serviceName ?? row.servicename ?? ''),
      value: Number(row.caHt ?? row.caht ?? 0),
    }))

    const responseData = {
      kpis,
      monthlyData,
      serviceDistribution,
      sales: range === 'custom' ? salesForCustom : undefined,
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
