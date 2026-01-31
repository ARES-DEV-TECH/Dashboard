import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Sur Vercel, utiliser le pooler si défini (évite que l'URL directe soit utilisée par erreur)
const databaseUrl =
  process.env.VERCEL && process.env.DATABASE_POOLER_URL
    ? process.env.DATABASE_POOLER_URL
    : process.env.DATABASE_URL

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    databaseUrl
      ? { datasources: { db: { url: databaseUrl } } }
      : undefined
  )

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
