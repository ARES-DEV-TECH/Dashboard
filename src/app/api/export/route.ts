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
      select: { key: true, value: true },
    })

    const payload = {
      parameters,
      exportedAt: new Date().toISOString(),
    }

    return NextResponse.json(payload, {
      headers: {
        'Content-Disposition': `attachment; filename="ares-dashboard-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export' },
      { status: 500 }
    )
  }
}
