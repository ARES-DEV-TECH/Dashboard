import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Sur Vercel, utiliser le pooler si défini (évite que l'URL directe soit utilisée par erreur).
// connection_limit=1 recommandé en serverless pour ne pas épuiser le pool (voir PROD-CHECKLIST).
function getDatabaseUrl(): string | undefined {
  const url = process.env.VERCEL && process.env.DATABASE_POOLER_URL
    ? process.env.DATABASE_POOLER_URL
    : process.env.DATABASE_URL
  if (!url) return undefined
  if (url.includes('connection_limit=')) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}connection_limit=1`
}

const databaseUrl = getDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    databaseUrl
      ? { datasources: { db: { url: databaseUrl } } }
      : undefined
  )

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
