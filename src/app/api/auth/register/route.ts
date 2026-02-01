import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, generateEmailVerificationToken } from '@/lib/auth'
import { escapeHtml } from '@/lib/utils'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  company: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.parse(body)
    const email = String(parsed.email).trim().toLowerCase()
    const { password, firstName, lastName, company } = parsed

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un utilisateur avec cet email existe déjà' },
        { status: 400 }
      )
    }

    // Créer l'utilisateur
    const hashedPassword = await hashPassword(password)
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        company
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        company: true
      }
    })

    // Créer les paramètres par défaut pour l'utilisateur
    await prisma.parametresEntreprise.createMany({
      data: [
        { key: 'defaultTvaRate', value: '20', userId: user.id },
        { key: 'tauxUrssaf', value: '22', userId: user.id },
        { key: 'companyName', value: company || [firstName, lastName].filter(Boolean).join(' ') || email, userId: user.id },
        { key: 'companyAddress', value: '', userId: user.id },
        { key: 'companyPhone', value: '', userId: user.id },
        { key: 'companyEmail', value: email, userId: user.id },
        { key: 'logoPath', value: '', userId: user.id }
      ]
    })

    // Email de confirmation : lien pour valider le compte (non bloquant)
    const { sendEmail } = await import('@/lib/email')
    const safeFirstName = firstName?.trim()
    const greeting = safeFirstName ? `Bonjour ${escapeHtml(safeFirstName)},` : 'Bonjour,'
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : request.nextUrl.origin
    const verificationToken = generateEmailVerificationToken(user.id, user.email)
    const confirmUrl = `${baseUrl}/confirm-email?token=${encodeURIComponent(verificationToken)}`
    sendEmail({
      to: email,
      subject: 'Validez votre compte ARES Dashboard',
      html: `
        <p>${greeting}</p>
        <p>Vous venez de créer un compte sur ARES Dashboard. Pour l'activer et pouvoir vous connecter, cliquez sur le lien ci-dessous.</p>
        <p><a href="${confirmUrl}" style="color:#6366f1;">Valider mon compte</a></p>
        <p>Ce lien expire dans 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.</p>
        <p>— L'équipe ARES Dashboard</p>
      `,
    }).catch(() => {})

    // Pas de cookie : l'utilisateur doit d'abord valider son email
    return NextResponse.json({
      message: 'Un email de confirmation vous a été envoyé. Cliquez sur le lien pour activer votre compte.',
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Erreur lors de l\'inscription:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
