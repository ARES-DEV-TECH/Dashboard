import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { updateClientSchema } from '@/lib/validations'

function buildClientName(firstName: string, lastName: string): string {
  return [firstName, lastName].map((s) => s?.trim()).filter(Boolean).join(' ').trim()
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientName: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateClientSchema.parse(body)
    const oldClientName = decodeURIComponent((await params).clientName)
    const existingClient = await prisma.client.findUnique({
      where: { clientName: oldClientName },
      select: { userId: true },
    })
    if (!existingClient || existingClient.userId !== user.id) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    const newClientName = buildClientName(validatedData.firstName, validatedData.lastName)
    if (!newClientName) {
      return NextResponse.json(
        { error: 'Prénom et nom sont requis' },
        { status: 400 }
      )
    }

    const updateData = {
      firstName: validatedData.firstName.trim(),
      lastName: validatedData.lastName.trim(),
      email: validatedData.email ?? undefined,
      phone: validatedData.phone,
      website: validatedData.website,
      company: validatedData.company,
    }

    if (newClientName !== oldClientName) {
      const existing = await prisma.client.findUnique({ where: { clientName: newClientName } })
      if (existing) {
        return NextResponse.json(
          { error: 'Un client avec ce nom existe déjà' },
          { status: 409 }
        )
      }
      await prisma.$transaction([
        prisma.client.update({
          where: { clientName: oldClientName },
          data: { ...updateData, clientName: newClientName },
        }),
        prisma.sale.updateMany({ where: { clientName: oldClientName }, data: { clientName: newClientName } }),
        prisma.charge.updateMany({ where: { linkedClient: oldClientName }, data: { linkedClient: newClientName } }),
        prisma.quote.updateMany({ where: { clientName: oldClientName }, data: { clientName: newClientName } }),
        prisma.invoice.updateMany({ where: { clientName: oldClientName }, data: { clientName: newClientName } }),
      ])
    } else {
      await prisma.client.update({
        where: { clientName: oldClientName },
        data: updateData,
      })
    }

    const client = await prisma.client.findUnique({
      where: { clientName: newClientName },
    })

    return NextResponse.json(client!)
  } catch (error) {
    console.error('Error updating client:', error)
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientName: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { clientName } = await params
    const decodedName = decodeURIComponent(clientName)
    const existingClient = await prisma.client.findUnique({
      where: { clientName: decodedName },
      select: { userId: true },
    })
    if (!existingClient || existingClient.userId !== user.id) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })
    }

    await prisma.client.delete({
      where: { clientName: decodedName },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}
