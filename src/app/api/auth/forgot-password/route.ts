import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { generateResetToken } from '@/lib/auth'
import { getClientIdentifier, checkRateLimit, AUTH_RATE_LIMIT } from '@/lib/rate-limit'
import { escapeHtml } from '@/lib/utils'

const schema = z.object({ email: z.string().email('Email invalide') })

export async function POST(request: NextRequest) {
  try {
    const clientId = getClientIdentifier(request)
    const { allowed, retryAfterSeconds } = checkRateLimit(clientId, 'forgot-password', AUTH_RATE_LIMIT.forgotPassword)
    if (!allowed) {
      const res = NextResponse.json(
        { error: 'Trop de demandes. Réessayez dans quelques minutes.' },
        { status: 429 }
      )
      if (retryAfterSeconds != null) res.headers.set('Retry-After', String(retryAfterSeconds))
      return res
    }

    const body = await request.json()
    const { email } = schema.parse(body)
    const trimmedEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      select: { id: true, firstName: true },
    })
    if (!user) {
      return NextResponse.json({ message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' }, { status: 200 })
    }

    const token = generateResetToken(trimmedEmail)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : request.nextUrl.origin
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`

    const { sendEmail, isEmailConfigured } = await import('@/lib/email')
    const safeFirstName = user.firstName?.trim()
    const greeting = safeFirstName ? `Bonjour ${escapeHtml(safeFirstName)},` : 'Bonjour,'
    const emailSent = await sendEmail({
      to: trimmedEmail,
      subject: 'Réinitialisation de votre mot de passe - ARES Dashboard',
      html: `
        <p>${greeting}</p>
        <p>Vous avez demandé une réinitialisation de mot de passe.</p>
        <p><a href="${resetUrl}" style="color:#6366f1;">Réinitialiser mon mot de passe</a></p>
        <p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        <p>— ARES Dashboard</p>
      `,
    })

    const json: { message: string; resetLink?: string; emailNotConfigured?: boolean; emailSendFailed?: boolean } = {
      message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
    }
    if (user && !isEmailConfigured()) {
      json.resetLink = resetUrl
      if (process.env.NODE_ENV === 'production') json.emailNotConfigured = true
    }
    if (user && isEmailConfigured() && !emailSent) {
      console.error('forgot-password: sendEmail failed for', trimmedEmail)
      json.message = 'Un problème technique a empêché l\'envoi de l\'email. Vérifiez la configuration SMTP/Resend ou réessayez plus tard.'
      json.emailSendFailed = true
    }
    return NextResponse.json(json, { status: 200 })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Email invalide', details: e.issues }, { status: 400 })
    }
    console.error('forgot-password:', e)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
