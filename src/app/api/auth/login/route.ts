import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'
import { getClientIdentifier, checkRateLimit, AUTH_RATE_LIMIT } from '@/lib/rate-limit'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
  rememberMe: z
    .union([z.boolean(), z.string()])
    .optional()
    .default(true)
    .transform((v) => v === true || v === 'true' || v === 'on')
})

export async function POST(request: NextRequest) {
  try {
    const clientId = getClientIdentifier(request)
    const { allowed, retryAfterSeconds } = checkRateLimit(clientId, 'login', AUTH_RATE_LIMIT.login)
    if (!allowed) {
      const res = NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429 }
      )
      if (retryAfterSeconds != null) res.headers.set('Retry-After', String(retryAfterSeconds))
      return res
    }

    const contentType = request.headers.get('content-type') || ''
    let body: { email?: string; password?: string; rememberMe?: boolean }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      const rememberVal = formData.get('rememberMe')
      body = {
        email: (formData.get('email') as string)?.trim?.() || '',
        password: (formData.get('password') as string) || '',
        rememberMe: rememberVal === 'true' || rememberVal === 'on',
      }
    } else {
      body = await request.json()
    }

    const { email, password, rememberMe } = loginSchema.parse(body)

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email }
    })

    const wantsRedirect = request.nextUrl.searchParams.get('redirect') === 'true'
    const loginErrorUrl = new URL('/login', request.url)
    loginErrorUrl.searchParams.set('error', 'invalid_credentials')

    if (!user) {
      if (wantsRedirect) {
        return NextResponse.redirect(loginErrorUrl, 302)
      }
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Vérifier le mot de passe
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      if (wantsRedirect) {
        return NextResponse.redirect(loginErrorUrl, 302)
      }
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      )
    }

    // Générer le token (durée selon "Se souvenir de moi")
    const tokenExpiresIn = rememberMe ? '30d' : '12h'
    const token = generateToken(
      {
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        company: user.company ?? undefined,
      },
      tokenExpiresIn
    )

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      ...(rememberMe
        ? { maxAge: 30 * 24 * 60 * 60 } // 30 jours
        : {}) // pas de maxAge = cookie de session (fermeture du navigateur)
    }

    if (wantsRedirect) {
      // 200 + cookie + page HTML qui redirige : plus fiable que 302 avec cookie
      // (certains navigateurs n'enregistrent pas le cookie sur une 302)
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=/dashboard"><script>window.location.replace("/dashboard");</script></head><body>Redirection…</body></html>`
      const response = new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
      response.cookies.set('auth-token', token, cookieOptions)
      return response
    }

    // Réponse JSON pour fetch()
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, company: user.company },
      message: 'Connexion réussie'
    })
    response.cookies.set('auth-token', token, cookieOptions)
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Erreur lors de la connexion:', message, error)
    if (error instanceof Error && error.cause) console.error('Cause:', error.cause)

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
