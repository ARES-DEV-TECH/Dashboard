import { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { prisma } from '@/lib/db'
import { requireAuth, zodErrorResponse, apiError } from '@/lib/api-utils'
import { updateSaleSchema } from '@/lib/validations'
import { calculateSaleAmounts } from '@/lib/math'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceNo: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request)
  if (authResponse) return authResponse

  try {
    const body = await request.json()
    const raw = (await params).invoiceNo
    const invoiceNo = typeof raw === 'string' ? decodeURIComponent(raw).trim() : ''
    if (!invoiceNo) {
      return apiError('Numéro de facture manquant', 400)
    }

    // Mise à jour du statut seul (depuis le tableau "Ventes récentes" du dashboard)
    const bodyKeys = Object.keys(body as object).filter(k => !['caHt', 'tvaAmount', 'totalTtc', 'year'].includes(k))
    const statusOnly = bodyKeys.length === 1 && bodyKeys[0] === 'status' && typeof (body as { status?: string }).status === 'string'
    const validStatuses = ['paid', 'pending', 'cancelled']
    if (statusOnly && validStatuses.includes((body as { status: string }).status)) {
      const existing = await prisma.sale.findUnique({
        where: { userId_invoiceNo: { userId: user.id, invoiceNo } },
        select: { userId: true },
      })
      if (!existing || existing.userId !== user.id) {
        return apiError('Vente non trouvée', 404)
      }
      const sale = await prisma.sale.update({
        where: { userId_invoiceNo: { userId: user.id, invoiceNo } },
        data: { status: (body as { status: string }).status },
      })
      return Response.json({ sale })
    }

    // Mise à jour complète (formulaire vente)
    const { caHt, tvaAmount, totalTtc, year, ...bodyForValidation } = body as Record<string, unknown>
    const validatedData = updateSaleSchema.parse(bodyForValidation)

    // Don't include invoiceNo in update data: we update by invoiceNo (URL), changing it would cause unique constraint errors
    const { invoiceNo: _ignored, ...restValidated } = validatedData
    const updateData = {
      ...restValidated,
      saleDate: new Date(validatedData.saleDate),
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
      status: validatedData.status
    }

    // Options : total des options sélectionnées
    let optionsTotal = 0
    if (validatedData.options) {
      try {
        const options = JSON.parse(validatedData.options)
        optionsTotal = options
          .filter((opt: { selected?: boolean; priceHt?: number }) => opt.selected)
          .reduce((sum: number, opt: { priceHt?: number }) => sum + (opt.priceHt || 0), 0)
      } catch {
        // ignore
      }
    }

    const existingSale = await prisma.sale.findUnique({
      where: { userId_invoiceNo: { userId: user.id, invoiceNo } },
      select: { userId: true },
    })
    if (!existingSale || existingSale.userId !== user.id) {
      return apiError('Vente non trouvée', 404)
    }

    // Taux TVA de l'utilisateur (en base)
    const tvaParam = await prisma.parametresEntreprise.findFirst({
      where: { userId: user.id, key: 'defaultTvaRate' },
    })
    const tvaRate = tvaParam ? parseFloat(tvaParam.value) : 20

    // Calculate amounts
    const amounts = await calculateSaleAmounts(
      validatedData.quantity,
      validatedData.unitPriceHt,
      optionsTotal,
      tvaRate
    )

    const sale = await prisma.sale.update({
      where: { userId_invoiceNo: { userId: user.id, invoiceNo } },
      data: {
        ...updateData,
        ...amounts,
        year: new Date(validatedData.saleDate).getFullYear(),
      },
    })

    return Response.json({ sale })
  } catch (error) {
    if (error instanceof ZodError) return zodErrorResponse(error)
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return apiError('Vente non trouvée', 404)
    }
    return apiError(error instanceof Error ? error.message : 'Erreur lors de la mise à jour de la vente', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceNo: string }> }
) {
  const { user, response: authResponse } = await requireAuth(request)
  if (authResponse) return authResponse

  try {
    const raw = (await params).invoiceNo
    const invoiceNo = typeof raw === 'string' ? decodeURIComponent(raw).trim() : ''
    if (!invoiceNo) {
      return apiError('Numéro de facture manquant', 400)
    }
    const existing = await prisma.sale.findUnique({
      where: { userId_invoiceNo: { userId: user.id, invoiceNo } },
      select: { userId: true },
    })
    if (!existing || existing.userId !== user.id) {
      return apiError('Vente non trouvée', 404)
    }

    await prisma.sale.delete({
      where: { userId_invoiceNo: { userId: user.id, invoiceNo } },
    })

    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return apiError('Vente non trouvée', 404)
    }
    return apiError(error instanceof Error ? error.message : 'Erreur lors de la suppression de la vente', 500)
  }
}