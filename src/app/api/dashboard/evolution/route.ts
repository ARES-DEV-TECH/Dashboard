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
    const statusParam = searchParams.get('status') // 'paid' | 'pending' | 'all' (default: 'paid')
    const monthParam = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
    const customStartDate = searchParams.get('startDate')
    const customEndDate = searchParams.get('endDate')

    // Déterminer la période globale et la granularité (alignée sur l'API dashboard pour KPIs ↔ graphique cohérents)
    let startDate: Date
    let endDate: Date
    let granularity: 'day' | 'month' = 'month'
    let steps = 12
    let monthOffset = 0 // Pour année : 0 ; pour trimestre : premier mois du trimestre (0,3,6,9)

    if (range === 'month' && monthParam) {
      // Vue mensuelle : 1er au dernier jour du mois (UTC pour cohérence avec ventes stockées en date seule)
      const lastDay = new Date(Date.UTC(year, monthParam, 0)).getUTCDate()
      startDate = new Date(Date.UTC(year, monthParam - 1, 1, 0, 0, 0, 0))
      endDate = new Date(Date.UTC(year, monthParam - 1, lastDay, 23, 59, 59, 999))
      granularity = 'day'
      steps = lastDay
    } else if (range === 'quarter' && monthParam) {
      // Vue trimestrielle : 3 mois (même période que les KPIs)
      const targetQuarter = Math.ceil(monthParam / 3)
      monthOffset = (targetQuarter - 1) * 3
      startDate = new Date(year, monthOffset, 1)
      endDate = new Date(year, monthOffset + 3, 0)
      granularity = 'month'
      steps = 3
    } else if (range === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate + 'T00:00:00.000Z')
      endDate = new Date(customEndDate + 'T23:59:59.999Z')
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff <= 35) {
        granularity = 'day'
        steps = daysDiff
      } else {
        granularity = 'month'
        // Nombre de mois entre start et end (max 12 pour l'affichage)
        const monthsCount = Math.min(12, (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1)
        steps = Math.max(1, monthsCount)
      }
    } else {
      // Vue annuelle (défaut)
      startDate = new Date(year, 0, 1)
      endDate = new Date(year, 11, 31)
      granularity = 'month'
      steps = 12
    }

    // Filtre statut
    const statusFilter = statusParam === 'all'
      ? {}
      : { status: statusParam || 'paid' }

    // Récupérer ventes (y compris récurrentes passées), charges, services et clients
    const [sales, charges, services, clients] = await Promise.all([
      prisma.sale.findMany({
        where: {
          userId: user.id,
          OR: [
            {
              saleDate: { gte: startDate, lte: endDate },
              ...statusFilter
            }, // Ventes de la période
            {
              recurring: true,
              ...statusFilter
            } // Toutes les ventes récurrentes
          ]
        },
        select: {
          saleDate: true,
          caHt: true,
          totalTtc: true,
          serviceName: true,
          clientName: true,
          invoiceNo: true,
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
          expenseDate: true,
          amount: true,
          recurring: true,
          recurringType: true,
          endDate: true,
          linkedService: true,
          linkedClient: true,
          linkedSaleId: true,
          year: true
        }
      }),
      prisma.article.findMany({
        where: { userId: user.id },
        select: { serviceName: true, priceHt: true }
      }),
      prisma.client.findMany({
        where: { userId: user.id },
        select: { clientName: true, email: true }
      })
    ])

    const typedSales = sales as any[]

    // Créer les données d'évolution
    const evolutionData = []

    for (let step = 1; step <= steps; step++) {
      let stepStart: Date
      let stepEnd: Date
      let label: string

      if (granularity === 'day') {
        if (range === 'custom') {
          // Plage personnalisée : step = jour 1, 2, ... dans la plage
          stepStart = new Date(startDate)
          stepStart.setDate(stepStart.getDate() + step - 1)
          stepStart.setHours(0, 0, 0, 0)
          stepEnd = new Date(stepStart)
          stepEnd.setHours(23, 59, 59, 999)
          label = stepStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        } else {
          // Vue mensuelle : step = jour du mois (UTC pour matcher les ventes stockées en date seule)
          stepStart = new Date(Date.UTC(year, (monthParam!) - 1, step, 0, 0, 0, 0))
          stepEnd = new Date(Date.UTC(year, (monthParam!) - 1, step, 23, 59, 59, 999))
          label = stepStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        }
      } else {
        // granularity === 'month'
        if (range === 'quarter') {
          stepStart = new Date(year, monthOffset + step - 1, 1)
          stepEnd = new Date(year, monthOffset + step, 0, 23, 59, 59)
          label = stepStart.toLocaleDateString('fr-FR', { month: 'long' })
        } else if (range === 'custom') {
          const stepMonth = new Date(startDate.getFullYear(), startDate.getMonth() + step - 1, 1)
          stepStart = stepMonth < startDate ? new Date(startDate) : stepMonth
          stepEnd = new Date(stepMonth.getFullYear(), stepMonth.getMonth() + 1, 0, 23, 59, 59)
          if (stepEnd > endDate) stepEnd = new Date(endDate)
          label = stepStart.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
        } else {
          // Année complète (1-12)
          stepStart = new Date(year, step - 1, 1)
          stepEnd = new Date(year, step, 0, 23, 59, 59)
          label = stepStart.toLocaleDateString('fr-FR', { month: 'long' })
        }
      }

      // Ventes de l'étape
      let totalSalesHt = 0
      let totalSalesTtc = 0
      let stepSalesCount = 0
      const stepSalesItems: typeof sales = []

      sales.forEach(sale => {
        const saleDate = new Date(sale.saleDate)

        let includeSale = false

        if (sale.recurring) {
          // Pour la récurrence, on simplifie :
          // Si c'est une vue mensuelle (jours), on étale le montant sur le mois ?
          // NON, une vente récurrente mensuelle est facturée UNE fois par mois.
          // À quelle date ? Généralement à la date anniversaire (jour du mois).
          // Si la vente initiale est le 15/01, elle se répète le 15/02, 15/03...

          const initialDay = saleDate.getDate()
          const initialMonth = saleDate.getMonth()
          const saleEndDate = sale.endDate ? new Date(sale.endDate) : null

          // Helper to check if a date is within sale validity
          const isDateValid = (d: Date) => {
            if (!saleEndDate) return true
            // Compare dates only (ignore time for end date check to be inclusive)
            const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
            const eTime = new Date(saleEndDate.getFullYear(), saleEndDate.getMonth(), saleEndDate.getDate()).getTime()
            return dTime <= eTime
          }

          if (granularity === 'day') {
            if (range === 'custom') {
              // Plage personnalisée : stepStart = un jour donné, on vérifie si une occurrence tombe ce jour-là
              const maxDay = new Date(stepStart.getFullYear(), stepStart.getMonth() + 1, 0).getDate()
              const occurrenceDate = new Date(stepStart.getFullYear(), stepStart.getMonth(), Math.min(initialDay, maxDay))
              if (sale.recurringType === 'mensuel') {
                if (occurrenceDate >= stepStart && occurrenceDate <= stepEnd && saleDate <= stepEnd && isDateValid(occurrenceDate)) includeSale = true
              } else if (sale.recurringType === 'annuel') {
                const occurrenceAnnuel = new Date(stepStart.getFullYear(), initialMonth, Math.min(initialDay, new Date(stepStart.getFullYear(), initialMonth + 1, 0).getDate()))
                if (occurrenceAnnuel >= stepStart && occurrenceAnnuel <= stepEnd && saleDate <= stepEnd && isDateValid(occurrenceAnnuel)) includeSale = true
              }
            } else {
              // Vue mensuelle (un seul mois) : step = jour du mois
              if (sale.recurringType === 'mensuel') {
                if (step === initialDay && saleDate <= stepEnd) {
                  const occurrenceDate = new Date(year, (monthParam!) - 1, step)
                  if (isDateValid(occurrenceDate)) includeSale = true
                }
              } else if (sale.recurringType === 'annuel') {
                if (step === initialDay && (monthParam! - 1) === initialMonth && saleDate <= stepEnd) {
                  const occurrenceDate = new Date(year, (monthParam!) - 1, step)
                  if (isDateValid(occurrenceDate)) includeSale = true
                }
              }
            }
          } else {
            // Vue mensuelle : utiliser stepStart/stepEnd (année, trimestre ou custom)
            if (sale.recurringType === 'mensuel') {
              if (saleDate <= stepEnd) {
                const occurrenceDate = new Date(stepStart.getFullYear(), stepStart.getMonth(), Math.min(initialDay, new Date(stepStart.getFullYear(), stepStart.getMonth() + 1, 0).getDate()))
                if (occurrenceDate >= stepStart && occurrenceDate <= stepEnd && isDateValid(occurrenceDate)) includeSale = true
              }
            } else if (sale.recurringType === 'annuel') {
              const occurrenceDate = new Date(stepStart.getFullYear(), initialMonth, Math.min(initialDay, new Date(stepStart.getFullYear(), initialMonth + 1, 0).getDate()))
              if (occurrenceDate >= stepStart && occurrenceDate <= stepEnd && saleDate <= stepEnd && isDateValid(occurrenceDate)) includeSale = true
            }
          }
        } else {
          // Vente ponctuelle
          if (granularity === 'day') {
            // Vue jour : comparer en UTC pour cohérence (ventes "date seule" = minuit UTC)
            const saleUtcDate = saleDate.getUTCDate()
            const saleUtcMonth = saleDate.getUTCMonth()
            const saleUtcYear = saleDate.getUTCFullYear()
            const stepUtcDate = stepStart.getUTCDate()
            const stepUtcMonth = stepStart.getUTCMonth()
            const stepUtcYear = stepStart.getUTCFullYear()
            if (saleUtcYear === stepUtcYear && saleUtcMonth === stepUtcMonth && saleUtcDate === stepUtcDate) {
              includeSale = true
            }
          } else {
            if (saleDate >= stepStart && saleDate <= stepEnd) {
              includeSale = true
            }
          }
        }

        if (includeSale) {
          totalSalesHt += sale.caHt || 0
          totalSalesTtc += sale.totalTtc || 0
          stepSalesCount++
          stepSalesItems.push(sale)
        }
      })

      // Charges de l'étape
      let totalChargesAmount = 0
      let stepChargesCount = 0

      charges.forEach(charge => {
        const chargeDate = new Date(charge.expenseDate)

        let includeCharge = false

        if (charge.recurring) {
          const initialDay = chargeDate.getDate()
          const initialMonth = chargeDate.getMonth()
          const chargeEndDate = charge.endDate ? new Date(charge.endDate) : null

          const isDateValid = (d: Date) => {
            if (!chargeEndDate) return true
            const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
            const eTime = new Date(chargeEndDate.getFullYear(), chargeEndDate.getMonth(), chargeEndDate.getDate()).getTime()
            return dTime <= eTime
          }

          if (granularity === 'day') {
            if (range === 'custom') {
              const maxDay = new Date(stepStart.getFullYear(), stepStart.getMonth() + 1, 0).getDate()
              const occurrenceDate = new Date(stepStart.getFullYear(), stepStart.getMonth(), Math.min(initialDay, maxDay))
              if (charge.recurringType === 'mensuel' || !charge.recurringType) {
                if (occurrenceDate >= stepStart && occurrenceDate <= stepEnd && chargeDate <= stepEnd && isDateValid(occurrenceDate)) includeCharge = true
              } else if (charge.recurringType === 'annuel') {
                const occurrenceAnnuel = new Date(stepStart.getFullYear(), initialMonth, Math.min(initialDay, new Date(stepStart.getFullYear(), initialMonth + 1, 0).getDate()))
                if (occurrenceAnnuel >= stepStart && occurrenceAnnuel <= stepEnd && chargeDate <= stepEnd && isDateValid(occurrenceAnnuel)) includeCharge = true
              }
            } else {
              if (charge.recurringType === 'mensuel' || !charge.recurringType) {
                if (step === initialDay && chargeDate <= stepEnd) {
                  const occurrenceDate = new Date(year, (monthParam!) - 1, step)
                  if (isDateValid(occurrenceDate)) includeCharge = true
                }
              } else if (charge.recurringType === 'annuel') {
                if (step === initialDay && (monthParam! - 1) === initialMonth && chargeDate <= stepEnd) {
                  const occurrenceDate = new Date(year, (monthParam!) - 1, step)
                  if (isDateValid(occurrenceDate)) includeCharge = true
                }
              }
            }
          } else {
            if (charge.recurringType === 'mensuel' || !charge.recurringType) {
              if (chargeDate <= stepEnd) {
                const occurrenceDate = new Date(stepStart.getFullYear(), stepStart.getMonth(), Math.min(initialDay, new Date(stepStart.getFullYear(), stepStart.getMonth() + 1, 0).getDate()))
                if (occurrenceDate >= stepStart && occurrenceDate <= stepEnd && isDateValid(occurrenceDate)) includeCharge = true
              }
            } else if (charge.recurringType === 'annuel') {
              const occurrenceDate = new Date(stepStart.getFullYear(), initialMonth, Math.min(initialDay, new Date(stepStart.getFullYear(), initialMonth + 1, 0).getDate()))
              if (occurrenceDate >= stepStart && occurrenceDate <= stepEnd && chargeDate <= stepEnd && isDateValid(occurrenceDate)) includeCharge = true
            }
          }
        } else {
          if (chargeDate >= stepStart && chargeDate <= stepEnd) {
            includeCharge = true
          }
        }

        if (includeCharge) {
          totalChargesAmount += charge.amount || 0
          stepChargesCount++
        }
      })

      // Analyser les liaisons
      const linkedSales = stepSalesItems.filter(sale => sale.serviceName || sale.clientName).length

      evolutionData.push({
        // Pour Recharts, on garde une clé générique "label" ou "monthName"
        // Le front attend "month" (numéro) ou "monthName"
        step: step,
        month: step, // Pour compatibilité legacy type
        monthName: label,
        sales: {
          count: stepSalesCount,
          totalHt: totalSalesHt,
          totalTtc: totalSalesTtc,
          linkedCount: linkedSales
        },
        charges: {
          count: stepChargesCount,
          totalHt: totalChargesAmount,
          totalTtc: totalChargesAmount,
          linkedCount: 0,
          crossLinkedCount: 0
        },
        result: totalSalesHt - totalChargesAmount
      })
    }

    // Totaux pour KPIs globaux (sur la période affichée)
    const periodTotals = evolutionData.reduce((acc, step) => ({
      salesHt: acc.salesHt + step.sales.totalHt,
      charges: acc.charges + step.charges.totalHt,
      linkedSales: acc.linkedSales + step.sales.linkedCount
    }), { salesHt: 0, charges: 0, linkedSales: 0 })

    // Analyse services/clients (sur les données brutes filtrées par la période globale)
    // On filtre les ventes/charges qui tombent dans la période [startDate, endDate]
    // incluant les récurrences projetées

    // Note: Pour faire simple et performant, on réutilise les totaux calculés par étape
    // Mais serviceAnalysis a besoin du détail par service.

    // On recalcule un set "activeSalesInPeriod"
    const activeSalesInPeriod: typeof sales = []
    // ... Logique similaire à la boucle steps mais sur toute la période ...
    // Pour simplifier, on prend toutes les ventes qui ont matché au moins une fois dans la boucle
    // Mais c'est complexe à extraire de la boucle.

    // On va faire une approximation acceptable : 
    // Analyse des services basée sur les ventes "réelles" dans la période + récurrentes actives

    const serviceAnalysis = services.map(service => {
      // Calculer le total projeté pour ce service sur la période
      let projectedTotal = 0
      let count = 0

      sales.forEach(sale => {
        const sDate = new Date(sale.saleDate)
        const items = typeof sale.items === 'string' ? JSON.parse(sale.items) : (sale.items || [])

        // Helper function to process individual item/sale
        const processItem = (itemName: string, itemHt: number) => {
          if (itemName !== service.serviceName) return

          if (!sale.recurring) {
            if (sDate >= startDate && sDate <= endDate) {
              projectedTotal += itemHt
              count++
            }
          } else {
            let occurrences = 0
            const saleEndDate = sale.endDate ? new Date(sale.endDate) : null

            if (sale.recurringType === 'mensuel') {
              let current = new Date(startDate)
              while (current <= endDate) {
                const occurrenceDate = new Date(current.getFullYear(), current.getMonth(), sDate.getDate())
                let isValid = true
                if (saleEndDate && occurrenceDate > saleEndDate) isValid = false
                if (isValid && occurrenceDate >= sDate && occurrenceDate >= startDate && occurrenceDate <= endDate) {
                  occurrences++
                }
                current.setMonth(current.getMonth() + 1)
              }
            } else if (sale.recurringType === 'annuel') {
              const occurrenceDate = new Date(year, sDate.getMonth(), sDate.getDate())
              let isValid = true
              if (saleEndDate && occurrenceDate > saleEndDate) isValid = false
              if (isValid && occurrenceDate >= sDate && occurrenceDate >= startDate && occurrenceDate <= endDate) {
                occurrences++
              }
            }
            projectedTotal += (itemHt * occurrences)
            count += occurrences
          }
        }

        if (Array.isArray(items) && items.length > 0) {
          items.forEach((item: any) => {
            const itemTotalHt = (item.quantity || 1) * ((item.unitPriceHt || 0) + (item.optionsTotalHt || 0))
            processItem(item.serviceName, itemTotalHt)
          })
        } else {
          processItem(sale.serviceName, sale.caHt)
        }
      })

      // On récupère aussi les charges liées
      const serviceCharges = charges.filter(c => c.linkedService === service.serviceName)
      // TODO: project charges too... Pour l'instant on garde le total brut des charges ponctuelles + récurrentes (x1 ?)
      // L'analyse service est indicative.

      return {
        serviceName: service.serviceName,
        unitPrice: service.priceHt,
        salesCount: count,
        salesTotal: projectedTotal,
        chargesCount: serviceCharges.length,
        chargesTotal: serviceCharges.reduce((sum, c) => sum + (c.amount || 0), 0),
        linkedClients: 0 // Compliqué à calculer avec projection
      }
    }).filter(s => s.salesCount > 0 || s.chargesCount > 0)

    // Analyse Clients
    const clientAnalysis = clients.map(client => {
      let projectedTotal = 0
      let count = 0

      sales.filter(s => s.clientName === client.clientName).forEach(sale => {
        const sDate = new Date(sale.saleDate)
        if (!sale.recurring) {
          if (sDate >= startDate && sDate <= endDate) {
            projectedTotal += sale.caHt
            count++
          }
        } else {
          let occurrences = 0
          const saleEndDate = sale.endDate ? new Date(sale.endDate) : null

          if (sale.recurringType === 'mensuel') {
            let current = new Date(startDate)
            while (current <= endDate) {
              const occurrenceDate = new Date(current.getFullYear(), current.getMonth(), sDate.getDate())
              let isValid = true
              if (saleEndDate && occurrenceDate > saleEndDate) isValid = false

              if (isValid && occurrenceDate >= sDate && occurrenceDate >= startDate && occurrenceDate <= endDate) {
                occurrences++
              }
              current.setMonth(current.getMonth() + 1)
            }
          } else if (sale.recurringType === 'annuel') {
            const occurrenceDate = new Date(year, sDate.getMonth(), sDate.getDate())
            let isValid = true
            if (saleEndDate && occurrenceDate > saleEndDate) isValid = false

            if (isValid && occurrenceDate >= sDate && occurrenceDate >= startDate && occurrenceDate <= endDate) {
              occurrences++
            }
          }
          projectedTotal += (sale.caHt * occurrences)
          count += occurrences
        }
      })

      return {
        clientName: client.clientName,
        contactPerson: client.email,
        salesCount: count,
        salesTotal: projectedTotal,
        chargesCount: 0,
        chargesTotal: 0,
        linkedServices: 0
      }
    }).filter(c => c.salesCount > 0).sort((a, b) => b.salesTotal - a.salesTotal)

    // Analyse Répartition Revenus (Récurrent vs Ponctuel)
    let totalRecurring = 0
    let totalOneTime = 0

    // On réutilise serviceAnalysis ou on refait une passe rapide ?
    // Refaisons une passe rapide sur sales agrégées
    // Ou mieux, on utilise clientAnalysis pour le total global et on sait déjà ce qui est récurrent dans sales...
    // Non, clientAnalysis mélange tout.

    sales.forEach(sale => {
      const sDate = new Date(sale.saleDate)
      let amount = 0

      // No need to parse items here if we just want the total caHt of the sale
      // because caHt column is already the sum of items.
      // But we must distinguish recurring vs one-time.

      if (!sale.recurring) {
        if (sDate >= startDate && sDate <= endDate) {
          amount = sale.caHt
          totalOneTime += amount
        }
      } else {
        let occurrences = 0
        const saleEndDate = sale.endDate ? new Date(sale.endDate) : null

        if (sale.recurringType === 'mensuel') {
          let current = new Date(startDate)
          while (current <= endDate) {
            const occurrenceDate = new Date(current.getFullYear(), current.getMonth(), sDate.getDate())
            let isValid = true
            if (saleEndDate && occurrenceDate > saleEndDate) isValid = false
            if (isValid && occurrenceDate >= sDate && occurrenceDate >= startDate && occurrenceDate <= endDate) occurrences++
            current.setMonth(current.getMonth() + 1)
          }
        } else if (sale.recurringType === 'annuel') {
          const occurrenceDate = new Date(year, sDate.getMonth(), sDate.getDate())
          let isValid = true
          if (saleEndDate && occurrenceDate > saleEndDate) isValid = false
          if (isValid && occurrenceDate >= sDate && occurrenceDate >= startDate && occurrenceDate <= endDate) occurrences++
        }
        amount = sale.caHt * occurrences
        totalRecurring += amount
      }
    })

    // Données mensuelles par service (ou journalières si range=month)
    const monthlyServiceData = []
    // On réutilise la boucle 'evolutionData' pour construire ça ?
    // C'est plus simple de le faire en post-traitement de evolutionData si on avait le détail.
    // Pour l'instant, on renvoie un tableau compatible mais vide ou simplifié pour la vue jour.

    // Si vue jour, on n'a pas besoin de "monthlyServiceData" pour le graph principal (AreaChart).
    // Mais DashboardServices l'utilise.

    // On va retourner monthlyEvolution qui est le principal.

    return NextResponse.json(
      {
        year,
        monthlyEvolution: evolutionData,
        monthlyServiceEvolution: [], // TODO: Adapter pour vue jour si nécessaire
        globalKpis: {
          totalSales: periodTotals.salesHt,
          totalCharges: periodTotals.charges,
          result: periodTotals.salesHt - periodTotals.charges,
          linkedSalesCount: periodTotals.linkedSales,
          linkedChargesCount: 0,
          crossLinkedCount: 0,
          linkingRate: 0,
          recurringShare: totalRecurring,
          oneTimeShare: totalOneTime
        },
        serviceAnalysis,
        clientAnalysis
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' } }
    )

  } catch (error) {
    console.error('Error fetching dashboard evolution:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération des données d\'évolution',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
