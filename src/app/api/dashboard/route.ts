import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, UserPayload } from '@/lib/auth'

export const GET = requireAuth(async (request: NextRequest, user: UserPayload) => {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
    const range = searchParams.get('range') || 'year'
    const statusParam = searchParams.get('status') // 'paid' | 'pending' | 'all' (default: 'paid')
    const customStartDate = searchParams.get('startDate')
    const customEndDate = searchParams.get('endDate')

    // Récupérer les paramètres entreprise
    const [urssafRow, tvaRow] = await Promise.all([
      prisma.parametresEntreprise.findFirst({ where: { key: 'tauxUrssaf', userId: user.id } }),
      prisma.parametresEntreprise.findFirst({ where: { key: 'defaultTvaRate', userId: user.id } })
    ])
    const tauxUrssaf = urssafRow ? parseFloat(urssafRow.value) : 22

    // Déterminer la période
    let startDate: Date
    let endDate: Date

    if (range === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate + 'T00:00:00.000Z')
      endDate = new Date(customEndDate + 'T23:59:59.999Z')
    } else {
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth() + 1
      switch (range) {
        case 'month': {
          // UTC pour cohérence avec l’API evolution et les ventes stockées en date seule (minuit UTC)
          const targetMonth = month || currentMonth
          const lastDay = new Date(Date.UTC(year, targetMonth, 0)).getUTCDate()
          startDate = new Date(Date.UTC(year, targetMonth - 1, 1, 0, 0, 0, 0))
          endDate = new Date(Date.UTC(year, targetMonth - 1, lastDay, 23, 59, 59, 999))
          break
        }
        case 'quarter': {
          const targetMonth = month || currentMonth
          const targetQuarter = Math.ceil(targetMonth / 3)
          const quarterStartMonth = (targetQuarter - 1) * 3
          startDate = new Date(year, quarterStartMonth, 1)
          endDate = new Date(year, quarterStartMonth + 3, 0, 23, 59, 59)
          break
        }
        default:
          startDate = new Date(year, 0, 1)
          endDate = new Date(year, 11, 31, 23, 59, 59)
          break
      }
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Dates invalides')
    }

    // Filtre statut
    const statusFilter = statusParam === 'all'
      ? {}
      : { status: statusParam || 'paid' }

    // Récupération des données (Ventes et Charges)
    const [salesRaw, charges] = await Promise.all([
      prisma.sale.findMany({
        where: {
          userId: user.id,
          OR: [
            {
              saleDate: { gte: startDate, lte: endDate },
              ...statusFilter
            }, // Ventes dans la période + statut
            {
              recurring: true,
              ...statusFilter
            } // Toutes les récurrentes + statut
          ]
        },
        select: {
          // id: true, // Pas d'ID sur Sale (clé composite)
          saleDate: true,
          caHt: true,
          totalTtc: true,
          serviceName: true,
          invoiceNo: true,
          clientName: true,
          recurring: true,
          recurringType: true,
          endDate: true,
          status: true,
          items: true
        }
      }),
      prisma.charge.findMany({
        where: {
          userId: user.id,
          OR: [
            { recurring: false, expenseDate: { gte: startDate, lte: endDate } },
            { recurring: true }
          ]
        },
        select: {
          amount: true,
          recurring: true,
          recurringType: true,
          endDate: true,
          category: true,
          expenseDate: true
        }
      })
    ])

    // --- Calcul des KPIs Ventes (avec projection) ---
    let totalCaHt = 0
    let totalCaTtc = 0
    const monthlyDataMap = new Map<number, { caHt: number; caTtc: number }>()
    const serviceStats = new Map<string, number>()

    for (let i = 0; i < 12; i++) {
      monthlyDataMap.set(i + 1, { caHt: 0, caTtc: 0 })
    }

    const sales = salesRaw as any[]

    sales.forEach(sale => {
      const saleDate = new Date(sale.saleDate)

      const addToTotals = (date: Date, amountHt: number, amountTtc: number) => {
        if (date >= startDate && date <= endDate) {
          totalCaHt += amountHt
          totalCaTtc += amountTtc

          // Service stats aggregation
          const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || [])
          if (Array.isArray(items) && items.length > 0) {
            items.forEach((item: any) => {
              const sName = item.serviceName || 'Autre'
              const itemTotalHt = (item.quantity || 1) * ((item.unitPriceHt || 0) + (item.optionsTotalHt || 0))
              serviceStats.set(sName, (serviceStats.get(sName) || 0) + itemTotalHt)
            })
          } else {
            const sName = sale.serviceName || 'Autre'
            serviceStats.set(sName, (serviceStats.get(sName) || 0) + amountHt)
          }

          if (date.getFullYear() === year) {
            const m = date.getMonth() + 1
            const current = monthlyDataMap.get(m) || { caHt: 0, caTtc: 0 }
            current.caHt += amountHt
            current.caTtc += amountTtc
            monthlyDataMap.set(m, current)
          }
        }
      }

      if (!sale.recurring) {
        addToTotals(saleDate, sale.caHt, sale.totalTtc)
      } else {
        const start = saleDate > startDate ? saleDate : startDate
        const rType = sale.recurringType || 'mensuel'
        const saleEndDate = sale.endDate ? new Date(sale.endDate) : null

        if (rType === 'mensuel') {
          const targetDay = saleDate.getDate()

          let currentMonthCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
          if (saleDate > startDate) {
            currentMonthCursor = new Date(saleDate.getFullYear(), saleDate.getMonth(), 1)
          }

          let safety = 0
          while (currentMonthCursor <= endDate) {
            if (safety++ > 100) break // Protection boucle infinie

            const y = currentMonthCursor.getFullYear()
            const m = currentMonthCursor.getMonth()
            const maxDay = new Date(y, m + 1, 0).getDate()
            const dayToUse = Math.min(targetDay, maxDay)

            const occurrence = new Date(y, m, dayToUse, saleDate.getHours(), saleDate.getMinutes())

            // Check end date if exists
            if (saleEndDate && occurrence > saleEndDate) {
              break; // Stop projecting if we passed the end date
            }

            if (occurrence >= saleDate && occurrence >= startDate && occurrence <= endDate) {
              addToTotals(occurrence, sale.caHt, sale.totalTtc)
            }
            currentMonthCursor.setMonth(currentMonthCursor.getMonth() + 1)
          }
        } else if (rType === 'annuel') {
          const occurrenceDate = new Date(year, saleDate.getMonth(), saleDate.getDate())

          let isValid = true
          if (saleEndDate && occurrenceDate > saleEndDate) isValid = false

          if (isValid && occurrenceDate >= saleDate && occurrenceDate >= startDate && occurrenceDate <= endDate) {
            addToTotals(occurrenceDate, sale.caHt, sale.totalTtc)
          }
        }
      }
    })

    // --- Calcul des Charges (avec projection) ---
    let totalChargesHt = 0

    charges.forEach(charge => {
      const chargeDate = new Date(charge.expenseDate)
      const amount = charge.amount || 0

      if (!charge.recurring) {
        if (chargeDate >= startDate && chargeDate <= endDate) {
          totalChargesHt += amount
        }
      } else {
        const rType = charge.recurringType || 'mensuel'
        const targetDay = chargeDate.getDate()
        const chargeEndDate = charge.endDate ? new Date(charge.endDate) : null

        if (rType === 'mensuel') {
          let currentMonthCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
          if (chargeDate > startDate) {
            currentMonthCursor = new Date(chargeDate.getFullYear(), chargeDate.getMonth(), 1)
          }

          let safety = 0
          while (currentMonthCursor <= endDate) {
            if (safety++ > 100) break // Protection

            const y = currentMonthCursor.getFullYear()
            const m = currentMonthCursor.getMonth()
            const maxDay = new Date(y, m + 1, 0).getDate()
            const dayToUse = Math.min(targetDay, maxDay)
            const occurrence = new Date(y, m, dayToUse)

            if (chargeEndDate && occurrence > chargeEndDate) {
              break;
            }

            if (occurrence >= chargeDate && occurrence >= startDate && occurrence <= endDate) {
              totalChargesHt += amount
            }
            currentMonthCursor.setMonth(currentMonthCursor.getMonth() + 1)
          }
        } else if (rType === 'annuel') {
          const occurrence = new Date(year, chargeDate.getMonth(), chargeDate.getDate())

          let isValid = true
          if (chargeEndDate && occurrence > chargeEndDate) isValid = false

          if (isValid && occurrence >= chargeDate && occurrence >= startDate && occurrence <= endDate) {
            totalChargesHt += amount
          }
        }
      }
    })

    const resultNet = totalCaHt - totalChargesHt
    const prelevementUrssaf = totalCaHt * (tauxUrssaf / 100)
    const resultAfterUrssaf = resultNet - prelevementUrssaf

    const kpis = {
      caHt: totalCaHt,
      caTtc: totalCaTtc,
      chargesHt: totalChargesHt,
      resultNet,
      resultAfterUrssaf,
      averageMargin: totalCaHt > 0 ? (resultAfterUrssaf / totalCaHt) * 100 : 0,
    }

    const monthlyData = Array.from(monthlyDataMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([m, val]) => ({
        month: m,
        monthName: new Date(year, m - 1, 1).toLocaleDateString('fr-FR', { month: 'short' }),
        caHt: val.caHt,
        caTtc: val.caTtc
      }))

    const serviceDistribution = Array.from(serviceStats.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const responseData = {
      kpis,
      monthlyData,
      serviceDistribution,
      sales: range === 'custom' ? [] : undefined
    }

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    })

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({
      error: 'Failed to fetch dashboard data',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
})
