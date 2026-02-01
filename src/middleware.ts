import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const publicPages = ['/login', '/register', '/forgot-password', '/reset-password', '/confirm-email']
const publicApiRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/logout', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/confirm-email', '/api/auth/resend-confirmation']

function isPublicApi(pathname: string) {
  return publicApiRoutes.some((r) => pathname === r || pathname.startsWith(r + '?'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect / → /dashboard (avec token) ou /login (sans) pour éviter de charger la page d'accueil
  if (pathname === '/') {
    const token = request.cookies.get('auth-token')?.value
    const dest = token ? '/dashboard' : '/login'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  if (publicPages.includes(pathname)) {
    return NextResponse.next()
  }
  if (pathname.startsWith('/api') && isPublicApi(pathname)) {
    return NextResponse.next()
  }

  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 500 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
  const token = request.cookies.get('auth-token')?.value

  const isApi = pathname.startsWith('/api')
  const isRscOrPrefetch =
    request.headers.get('RSC') === '1' ||
    request.headers.get('Next-Router-Prefetch') === '1' ||
    request.headers.get('x-nextjs-data') === '1' ||
    request.headers.get('x-middleware-prefetch') === '1'

  if (!token) {
    if (isApi || isRscOrPrefetch) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.id as string)
    if (payload.email) requestHeaders.set('x-user-email', String(payload.email))

    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  } catch {
    if (isApi || isRscOrPrefetch) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images).*)',
  ],
}
