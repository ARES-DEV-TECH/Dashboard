import type { PrismaClient } from '@prisma/client'

const PREFIX_REGEX = /^F(\d{4})-(\d+)$/

/**
 * Prochain numéro de facture au format F{année}-{seq 6 chiffres} pour un utilisateur.
 * Cherche les factures existantes F{year}-* pour cet user, prend le max des seq, retourne F{year}-{max+1}.
 * Si aucune : F{year}-000001.
 */
export async function getNextInvoiceNumber(
  prisma: PrismaClient,
  userId: string,
  year?: number
): Promise<string> {
  const y = year ?? new Date().getFullYear()
  const prefix = `F${y}-`
  const sales = await prisma.sale.findMany({
    where: {
      userId,
      invoiceNo: { startsWith: prefix },
    },
    select: { invoiceNo: true },
  })
  let maxSeq = 0
  for (const s of sales) {
    const m = s.invoiceNo.match(PREFIX_REGEX)
    if (m) {
      const seq = parseInt(m[2], 10)
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq
    }
  }
  const nextSeq = maxSeq + 1
  return `${prefix}${String(nextSeq).padStart(6, '0')}`
}
