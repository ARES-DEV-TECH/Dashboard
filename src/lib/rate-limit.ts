/**
 * Rate limiting en mémoire par instance (serverless).
 * En prod multi-instances, chaque instance a son propre compteur.
 * Pour une limite globale : prévoir Redis / Vercel KV (voir PROD-CHECKLIST).
 */
import type { NextRequest } from 'next/server'

const store = new Map<string, { count: number; resetAt: number }>()
const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, v] of store.entries()) {
    if (v.resetAt < now) store.delete(key)
  }
}

export function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

export type RateLimitOptions = {
  max: number
  windowMs: number
}

/**
 * Enregistre une tentative et retourne si la requête est autorisée.
 * Si non autorisée : retourne { allowed: false, retryAfterSeconds }.
 */
export function checkRateLimit(
  identifier: string,
  routeKey: string,
  options: RateLimitOptions
): { allowed: boolean; retryAfterSeconds?: number } {
  cleanup()
  const key = `${routeKey}:${identifier}`
  const now = Date.now()
  let bucket = store.get(key)

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 1, resetAt: now + options.windowMs }
    store.set(key, bucket)
    return { allowed: true }
  }

  bucket.count += 1
  if (bucket.count > options.max) {
    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000)
    return { allowed: false, retryAfterSeconds }
  }
  return { allowed: true }
}

/** Limites par défaut pour les routes auth (par IP, par fenêtre). */
export const AUTH_RATE_LIMIT = {
  login: { max: 10, windowMs: 60_000 },           // 10 tentatives / minute
  forgotPassword: { max: 5, windowMs: 60_000 },  // 5 demandes / minute
  resetPassword: { max: 5, windowMs: 60_000 },   // 5 soumissions / minute
} as const
