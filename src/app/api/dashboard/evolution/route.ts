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

    // Période pour l'année
    const startDate = new Date(year, 0, 1) // 1er janvier
    const endDate = new Date(year, 11, 31) // 31 décembre

    // Récupérer les ventes de l'année (utilisateur connecté ou ventes sans userId / historique)
    const sales = await prisma.sale.findMany({
      where: {
        OR: [{ userId: user.id }, { userId: null }],
        year,
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
        clientName: true,
        invoiceNo: true
      }
    })

    // Récupérer les charges (filtrées par utilisateur)
    const charges = await prisma.charge.findMany({
      where: {
        userId: user.id,
        OR: [
          // Charges ponctuelles dans l'année
          {
            recurring: false,
            year,
            expenseDate: {
              gte: startDate,
              lte: endDate
            }
          },
          // Toutes les charges récurrentes
          {
            recurring: true
          }
        ]
      },
      select: {
        expenseDate: true,
        amount: true,
        recurring: true,
        recurringType: true,
        linkedService: true,
        linkedClient: true,
        linkedSaleId: true,
        year: true
      }
    })

    // Récupérer les services pour les liaisons (filtrés par utilisateur)
    const services = await prisma.article.findMany({
      where: { userId: user.id },
      select: {
        serviceName: true,
        priceHt: true
      }
    })

    // Récupérer les clients pour les liaisons (filtrés par utilisateur)
    const clients = await prisma.client.findMany({
      where: { userId: user.id },
      select: {
        clientName: true,
        email: true
      }
    })

    // Créer les données mensuelles
    const monthlyData = []
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0) // Dernier jour du mois

      // Ventes du mois
      const monthSales = sales.filter(sale => {
        const saleDate = new Date(sale.saleDate)
        return saleDate >= monthStart && saleDate <= monthEnd
      })

      // Calculer les charges du mois avec la logique récurrente
      let totalChargesAmount = 0
      let monthChargesCount = 0
      
      charges.forEach(charge => {
        const chargeDate = new Date(charge.expenseDate)
        const chargeYear = chargeDate.getFullYear()
        const chargeMonth = chargeDate.getMonth() + 1 // +1 car getMonth() retourne 0-11
        
        if (charge.recurring) {
          if (charge.recurringType === 'mensuel') {
            // Charge mensuelle : inclure si elle est dans l'année
            if (chargeYear <= year) {
              totalChargesAmount += charge.amount || 0
              monthChargesCount++
            }
          } else if (charge.recurringType === 'annuel') {
            // Charge annuelle : inclure seulement le mois de paiement
            if (chargeYear === year && chargeMonth === month + 1) {
              totalChargesAmount += charge.amount || 0
              monthChargesCount++
            }
          } else {
            // Par défaut, traiter comme annuel
            if (chargeYear === year && chargeMonth === month + 1) {
              totalChargesAmount += charge.amount || 0
              monthChargesCount++
            }
          }
        } else {
          // Charge ponctuelle : inclure si elle est dans le mois
          if (chargeDate >= monthStart && chargeDate <= monthEnd) {
            totalChargesAmount += charge.amount || 0
            monthChargesCount++
          }
        }
      })

      // Calculer les totaux des ventes
      const totalSalesHt = monthSales.reduce((sum, sale) => sum + (sale.caHt || 0), 0)
      const totalSalesTtc = monthSales.reduce((sum, sale) => sum + (sale.totalTtc || 0), 0)

      // Analyser les liaisons
      const linkedSales = monthSales.filter(sale => sale.serviceName || sale.clientName).length
      const linkedCharges = 0 // TODO: Calculer les liaisons des charges récurrentes
      const crossLinked = 0 // TODO: Calculer les liaisons croisées

      monthlyData.push({
        month: month + 1,
        monthName: monthStart.toLocaleDateString('fr-FR', { month: 'long' }),
        sales: {
          count: monthSales.length,
          totalHt: totalSalesHt,
          totalTtc: totalSalesTtc,
          linkedCount: linkedSales
        },
        charges: {
          count: monthChargesCount,
          totalHt: totalChargesAmount,
          totalTtc: totalChargesAmount,
          linkedCount: linkedCharges,
          crossLinkedCount: crossLinked
        },
        result: totalSalesHt - totalChargesAmount
      })
    }

    // Calculer les KPIs globaux avec liaisons
    const totalSalesHt = sales.reduce((sum, sale) => sum + (sale.caHt || 0), 0)
    const totalChargesAmount = charges.reduce((sum, charge) => sum + (charge.amount || 0), 0)
    const totalLinkedSales = sales.filter(sale => sale.serviceName || sale.clientName).length
    const totalLinkedCharges = charges.filter(charge => charge.linkedService || charge.linkedClient || charge.linkedSaleId).length
    const totalCrossLinked = charges.filter(charge => charge.linkedSaleId).length

    // Analyser les liaisons par service
    const serviceAnalysis = services.map(service => {
      const serviceSales = sales.filter(sale => sale.serviceName === service.serviceName)
      const serviceCharges = charges.filter(charge => charge.linkedService === service.serviceName)
      
      return {
        serviceName: service.serviceName,
        unitPrice: service.priceHt,
        salesCount: serviceSales.length,
        salesTotal: serviceSales.reduce((sum, sale) => sum + (sale.caHt || 0), 0),
        chargesCount: serviceCharges.length,
        chargesTotal: serviceCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0),
        linkedClients: [...new Set(serviceSales.map(s => s.clientName).filter(Boolean))].length
      }
    }).filter(service => service.salesCount > 0 || service.chargesCount > 0)

    // Analyser les liaisons par client
    const clientAnalysis = clients.map(client => {
      const clientSales = sales.filter(sale => sale.clientName === client.clientName)
      const clientCharges = charges.filter(charge => charge.linkedClient === client.clientName)
      
      return {
        clientName: client.clientName,
        contactPerson: client.email,
        salesCount: clientSales.length,
        salesTotal: clientSales.reduce((sum, sale) => sum + (sale.caHt || 0), 0),
        chargesCount: clientCharges.length,
        chargesTotal: clientCharges.reduce((sum, charge) => sum + (charge.amount || 0), 0),
        linkedServices: [...new Set(clientSales.map(s => s.serviceName).filter(Boolean))].length
      }
    }).filter(client => client.salesCount > 0 || client.chargesCount > 0)

    // Calculer les données mensuelles par service
    const monthlyServiceData = []
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0) // Last day of the month

      const monthSales = sales.filter(sale => {
        const saleDate = new Date(sale.saleDate)
        return saleDate >= monthStart && saleDate <= monthEnd
      })

      // Calculer le CA par service pour ce mois
      const serviceData: Record<string, number> = {}
      services.forEach(service => {
        const serviceSales = monthSales.filter(sale => sale.serviceName === service.serviceName)
        serviceData[service.serviceName] = serviceSales.reduce((sum, sale) => sum + (sale.caHt || 0), 0)
      })

      monthlyServiceData.push({
        month: month + 1,
        monthName: monthStart.toLocaleDateString('fr-FR', { month: 'long' }),
        ...serviceData
      })
    }

    return NextResponse.json({
      year,
      monthlyEvolution: monthlyData,
      monthlyServiceEvolution: monthlyServiceData,
      globalKpis: {
        totalSales: totalSalesHt,
        totalCharges: totalChargesAmount,
        result: totalSalesHt - totalChargesAmount,
        linkedSalesCount: totalLinkedSales,
        linkedChargesCount: totalLinkedCharges,
        crossLinkedCount: totalCrossLinked,
        linkingRate: totalLinkedSales > 0 ? ((totalLinkedSales + totalLinkedCharges) / (sales.length + charges.length) * 100) : 0
      },
      serviceAnalysis,
      clientAnalysis
    })

  } catch (error) {
    console.error('Error fetching dashboard evolution:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données d\'évolution' },
      { status: 500 }
    )
  }
}
