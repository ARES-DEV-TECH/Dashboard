import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { generateResetToken } from '@/lib/auth'

const schema = z.object({ email: z.string().email('Email invalide') })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = schema.parse(body)
    const trimmedEmail = email.trim().toLowerCase()

    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } })
    if (!user) {
      return NextResponse.json({ message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' }, { status: 200 })
    }

    const token = generateResetToken(trimmedEmail)
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : request.nextUrl.origin
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`

    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: trimmedEmail,
          subject: 'Réinitialisation de votre mot de passe - ARES Dashboard',
          html: `
            <p>Bonjour,</p>
            <p>Vous avez demandé une réinitialisation de mot de passe.</p>
            <p><a href="${resetUrl}" style="color:#6366f1;">Réinitialiser mon mot de passe</a></p>
            <p>Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
            <p>— ARES Dashboard</p>
          `,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('Resend error:', res.status, err)
      }
    } else if (process.env.NODE_ENV !== 'production') {
      console.log('[DEV] Reset link:', resetUrl)
    }

    const json: { message: string; resetLink?: string; emailNotConfigured?: boolean } = {
      message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
    }
    if (user && !resendApiKey) {
      json.resetLink = resetUrl
      if (process.env.NODE_ENV === 'production') json.emailNotConfigured = true
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
