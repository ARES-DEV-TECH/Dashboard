#!/usr/bin/env npx tsx
/**
 * Envoie un email à chaque utilisateur (avec email vérifié) pour les prévenir
 * d’un changement d’URL du dashboard (ex. après déploiement Vercel ou changement de domaine).
 *
 * Usage :
 *   npx tsx scripts/notify-users-new-url.ts "https://nouvelle-url.vercel.app"
 *   npx tsx scripts/notify-users-new-url.ts "https://..." "contact@exemple.fr"  ← test : envoie uniquement à cette adresse
 *
 * La nouvelle URL est lue dans cet ordre :
 * 1. Argument en ligne de commande
 * 2. Variable d’environnement NEW_APP_URL
 * 3. Variable VERCEL_URL (préfixée par https://)
 *
 * Prérequis : .env.local avec DATABASE_URL, RESEND_API_KEY (ou SMTP), RESEND_FROM_EMAIL (ou SMTP_FROM).
 *
 * Note : En production Vercel, l’URL de prod (main) est stable. Utilisez un domaine personnalisé
 * pour éviter de changer d’URL. Ce script sert surtout quand vous changez de domaine ou de projet.
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { PrismaClient } from '@prisma/client'

let projectRoot = process.cwd()
if (!existsSync(resolve(projectRoot, 'package.json')) && typeof import.meta?.url === 'string') {
  projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
}

function loadEnvFile(file: string) {
  const path = resolve(projectRoot, file)
  if (!existsSync(path)) return false
  const content = readFileSync(path, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eq = trimmed.indexOf('=')
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim()
        const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    }
  }
  return true
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const prisma = new PrismaClient()

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function buildEmailHtml(newUrl: string, firstName: string | null): string {
  const prenom = firstName?.trim() || 'Bonjour'
  const safeUrl = newUrl.replace(/"/g, '&quot;')
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; line-height: 1.5; color: #333;">
  <p>${prenom},</p>
  <p>L’URL du dashboard a été mise à jour. Utilisez désormais l’adresse suivante pour vous connecter :</p>
  <p style="margin: 1rem 0;"><strong><a href="${safeUrl}">${safeUrl}</a></strong></p>
  <p>Pensez à mettre à jour vos favoris si nécessaire.</p>
  <p style="color: #666; font-size: 0.9rem;">— Équipe ARES Dashboard</p>
</body>
</html>
`.trim()
}

async function main() {
  const urlFromArg = process.argv[2]?.trim()
  const urlFromEnv = process.env.NEW_APP_URL?.trim()
  const vercelUrl = process.env.VERCEL_URL?.trim()

  const newUrl =
    urlFromArg ||
    urlFromEnv ||
    (vercelUrl ? `https://${vercelUrl}` : null)

  if (!newUrl || !newUrl.startsWith('http')) {
    console.error('❌ Indiquez la nouvelle URL :')
    console.error('   npx tsx scripts/notify-users-new-url.ts "https://votre-app.vercel.app"')
    console.error('   ou définissez NEW_APP_URL dans .env.local')
    process.exit(1)
  }

  const { sendEmail, isEmailConfigured } = await import('../src/lib/email')
  if (!isEmailConfigured()) {
    console.error('❌ Email non configuré : RESEND_API_KEY (ou SMTP_*) dans .env.local')
    process.exit(1)
  }

  const testEmail = process.argv[3]?.trim()

  if (testEmail) {
    console.log(`🧪 Test : envoi à 1 adresse uniquement — ${testEmail}`)
    console.log(`   URL : ${newUrl}`)
    const html = buildEmailHtml(newUrl, null)
    const sent = await sendEmail({
      to: testEmail,
      subject: 'Nouvelle URL du dashboard — mise à jour (test)',
      html,
    })
    await prisma.$disconnect()
    if (sent) {
      console.log('✅ Email envoyé. Vérifiez la boîte de réception (et les spams).')
      console.log('   Si tout est OK, relancez sans adresse pour envoyer à tous les utilisateurs.')
      process.exit(0)
    } else {
      console.error('❌ Échec d’envoi.')
      process.exit(1)
    }
  }

  // Uniquement les utilisateurs avec email vérifié (éviter les comptes en attente)
  const users = await prisma.user.findMany({
    where: { emailVerifiedAt: { not: null } },
    select: { id: true, email: true, firstName: true },
    orderBy: { createdAt: 'asc' },
  })

  if (users.length === 0) {
    console.log('Aucun utilisateur avec email vérifié.')
    await prisma.$disconnect()
    process.exit(0)
  }

  console.log(`Envoi de l’email à ${users.length} utilisateur(s) — nouvelle URL : ${newUrl}`)

  let ok = 0
  let fail = 0
  for (const user of users) {
    const html = buildEmailHtml(newUrl, user.firstName)
    const sent = await sendEmail({
      to: user.email,
      subject: 'Nouvelle URL du dashboard — mise à jour',
      html,
    })
    if (sent) {
      ok++
      console.log(`  ✅ ${user.email}`)
    } else {
      fail++
      console.log(`  ❌ ${user.email}`)
    }
    await delay(300)
  }

  console.log(`\nTerminé : ${ok} envoyé(s), ${fail} échec(s).`)
  await prisma.$disconnect()
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
