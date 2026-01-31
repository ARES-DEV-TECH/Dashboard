import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'
import { prisma } from './db'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'your-secret-key-change-in-production')
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('JWT_SECRET is required in production. Set the JWT_SECRET environment variable.')
  }
  return secret
}

export interface UserPayload {
  id: string
  email: string
  firstName?: string
  lastName?: string
  company?: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(user: UserPayload, expiresIn: string = '7d'): string {
  return jwt.sign(user, getJwtSecret(), { expiresIn } as jwt.SignOptions)
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as UserPayload
  } catch (error) {
    return null
  }
}

export async function getCurrentUser(request: NextRequest): Promise<UserPayload | null> {
  try {
    // Priorité à l'en-tête x-user-id défini par le middleware (cookie déjà vérifié côté Edge)
    const userIdFromHeader = request.headers.get('x-user-id')
    if (userIdFromHeader) {
      const user = await prisma.user.findUnique({
        where: { id: userIdFromHeader },
        select: { id: true, email: true, firstName: true, lastName: true, company: true }
      })
      return user ? { id: user.id, email: user.email, firstName: user.firstName ?? undefined, lastName: user.lastName ?? undefined, company: user.company ?? undefined } : null
    }

    // Fallback : cookie ou Authorization (pour appels directs sans passer par le middleware)
    const token = request.cookies.get('auth-token')?.value ||
                  request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return null
    }

    const payload = verifyToken(token)
    if (!payload) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, firstName: true, lastName: true, company: true }
    })

    return user ? { id: user.id, email: user.email, firstName: user.firstName ?? undefined, lastName: user.lastName ?? undefined, company: user.company ?? undefined } : null
  } catch {
    return null
  }
}

export function requireAuth(handler: (request: NextRequest, user: UserPayload) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const user = await getCurrentUser(request)
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return handler(request, user)
  }
}
