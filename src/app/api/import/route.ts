import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const parameters = Array.isArray(body.parameters) ? body.parameters : []

    if (parameters.length === 0) {
      return NextResponse.json({ error: 'Aucun paramètre à importer' }, { status: 400 })
    }

    for (const p of parameters) {
      const key = typeof p?.key === 'string' ? p.key.trim() : ''
      const value = p?.value != null ? String(p.value) : ''
      if (!key) continue
      await prisma.parametresEntreprise.upsert({
        where: { userId_key: { userId: user.id, key } },
        update: { value },
        create: { userId: user.id, key, value },
      })
    }

    return NextResponse.json({ success: true, imported: parameters.length })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'import" },
      { status: 500 }
    )
  }
}
