import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { generateEmailVerificationToken } from '@/lib/auth'
import { getClientIdentifier, checkRateLimit, AUTH_RATE_LIMIT } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email'
import { escapeHtml } from '@/lib/utils'

const schema = z.object({ email: z.string().email('Email invalide') })

export async function POST(request: NextRequest) {
  try {
    const clientId = getClientIdentifier(request)
    const { allowed, retryAfterSeconds } = checkRateLimit(
      clientId,
      'resend-confirmation',
      AUTH_RATE_LIMIT.resendConfirmation
    )
    if (!allowed) {
      const res = NextResponse.json(
        { error: 'Trop de demandes. Réessayez dans quelques minutes.' },
        { status: 429 }
      )
      if (retryAfterSeconds != null) res.headers.set('Retry-After', String(retryAfterSeconds))
      return res
    }

    const body = await request.json().catch(() => ({}))
    const { email } = schema.parse(body)
    const trimmedEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      select: { id: true, email: true, firstName: true, emailVerifiedAt: true },
    })

    // Même message si compte inexistant ou déjà vérifié (ne pas révéler l'état)
    const successMessage = 'Si un compte en attente de validation existe avec cet email, un nouveau lien vous a été envoyé.'

    if (!user) {
      return NextResponse.json({ message: successMessage }, { status: 200 })
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({ message: successMessage }, { status: 200 })
    }

    const verificationToken = generateEmailVerificationToken(user.id, user.email)
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : request.nextUrl.origin
    const confirmUrl = `${baseUrl}/confirm-email?token=${encodeURIComponent(verificationToken)}`
    const safeFirstName = user.firstName?.trim()
    const greeting = safeFirstName ? `Bonjour ${escapeHtml(safeFirstName)},` : 'Bonjour,'

    sendEmail({
      to: user.email,
      subject: 'Validez votre compte ARES Dashboard',
      html: `
        <p>${greeting}</p>
        <p>Vous avez demandé un nouveau lien pour activer votre compte. Cliquez ci-dessous pour valider votre inscription.</p>
        <p><a href="${confirmUrl}" style="color:#6366f1;">Valider mon compte</a></p>
        <p>Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        <p>— L'équipe ARES Dashboard</p>
      `,
    }).catch(() => {})

    return NextResponse.json({ message: successMessage }, { status: 200 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Email invalide.', details: e.issues },
        { status: 400 }
      )
    }
    console.error('resend-confirmation:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
