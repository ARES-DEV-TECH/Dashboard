import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyResetToken, hashPassword } from '@/lib/auth'

const schema = z.object({
  token: z.string().min(1, 'Token requis'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = schema.parse(body)

    const payload = verifyResetToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Lien invalide ou expiré. Demandez un nouveau lien.' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: payload.email } })
    if (!user) {
      return NextResponse.json({ error: 'Lien invalide ou expiré.' }, { status: 400 })
    }

    const hashedPassword = await hashPassword(password)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' }, { status: 200 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: e.issues }, { status: 400 })
    }
    console.error('reset-password:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
