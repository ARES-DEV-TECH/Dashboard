import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyEmailVerificationToken } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { escapeHtml } from '@/lib/utils'

const schema = z.object({ token: z.string().min(1, 'Token requis') })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { token } = schema.parse(body)

    const payload = verifyEmailVerificationToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré. Inscrivez-vous à nouveau ou demandez un nouvel email de confirmation.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, firstName: true, emailVerifiedAt: true },
    })

    if (!user || user.email !== payload.email) {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré.' },
        { status: 400 }
      )
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json(
        { success: true, message: 'Votre compte est déjà activé. Vous pouvez vous connecter.' },
        { status: 200 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    })

    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : request.nextUrl.origin
    const loginUrl = `${baseUrl}/login`
    const safeFirstName = user.firstName?.trim()
    const greeting = safeFirstName ? `Bonjour ${escapeHtml(safeFirstName)},` : 'Bonjour,'

    sendEmail({
      to: user.email,
      subject: 'Bienvenue sur ARES Dashboard',
      html: `
        <p>${greeting}</p>
        <p>Votre compte ARES Dashboard est maintenant activé.</p>
        <p><a href="${loginUrl}" style="color:#6366f1;">Se connecter à mon tableau de bord</a></p>
        <p>Utilisez l'email et le mot de passe que vous avez définis à l'inscription.</p>
        <p>— L'équipe ARES Dashboard</p>
      `,
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Compte activé. Vous pouvez vous connecter.',
    })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Token manquant ou invalide.', details: e.issues },
        { status: 400 }
      )
    }
    console.error('confirm-email:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
