import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, generateToken } from '@/lib/auth'
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
    const { email, password, firstName, lastName, company } = registerSchema.parse(body)

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
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

    // Générer le token
    const token = generateToken({
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      company: user.company ?? undefined,
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

    // Retourner la réponse avec le token en cookie
    const response = NextResponse.json({
      user,
      message: 'Utilisateur créé avec succès'
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 jours
    })

    return response
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
