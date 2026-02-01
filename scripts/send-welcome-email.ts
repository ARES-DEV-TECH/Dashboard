#!/usr/bin/env npx tsx
/**
 * Envoie un email de bienvenue de test.
 * Usage : npx tsx scripts/send-welcome-email.ts
 * Prérequis : RESEND_API_KEY ou SMTP_* dans .env ou .env.local
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Racine projet : cwd en priorité (là où tu lances la commande), sinon dossier parent du script
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

// Charger .env puis .env.local (le second écrase le premier)
const loadedEnv = loadEnvFile('.env')
const loadedLocal = loadEnvFile('.env.local')

const TO_EMAIL = 'contact@arezkidjerbi.fr'

async function main() {
  const { sendEmail, isEmailConfigured } = await import('../src/lib/email')
  if (!isEmailConfigured()) {
    console.error('Aucun transport email configuré.')
    console.error(`Racine projet : ${projectRoot}`)
    console.error(`  .env : ${loadedEnv ? 'chargé' : 'absent'} ${loadedEnv ? `(${resolve(projectRoot, '.env')})` : ''}`)
    console.error(`  .env.local : ${loadedLocal ? 'chargé' : 'absent'} ${loadedLocal ? `(${resolve(projectRoot, '.env.local')})` : ''}`)
    console.error(`  SMTP_HOST : ${process.env.SMTP_HOST ? 'défini' : 'non défini'}`)
    console.error(`  SMTP_USER : ${process.env.SMTP_USER ? 'défini' : 'non défini'}`)
    console.error(`  SMTP_PASSWORD : ${process.env.SMTP_PASSWORD ? 'défini' : 'non défini'}`)
    const emailKeys = Object.keys(process.env).filter((k) => k.startsWith('SMTP_') || k.startsWith('RESEND_'))
    console.error(`  Clés email chargées : ${emailKeys.length ? emailKeys.join(', ') : 'aucune'}`)
    console.error('')
    console.error('Vérifier que .env.local contient exactement (sans espace autour du =) :')
    console.error('  • Resend : RESEND_API_KEY=re_xxx et optionnel RESEND_FROM_EMAIL=...')
    console.error('  • SMTP (ex. Hostinger) : SMTP_HOST=smtp.hostinger.com SMTP_PORT=465 SMTP_USER=... SMTP_PASSWORD=... SMTP_FROM=...')
    process.exit(1)
  }
  const ok = await sendEmail({
    to: TO_EMAIL,
    subject: 'Bienvenue sur ARES Dashboard',
    html: `
      <p>Bonjour,</p>
      <p>Votre compte ARES Dashboard a été créé avec succès.</p>
      <p>Vous pouvez vous connecter dès maintenant pour accéder à votre tableau de bord.</p>
      <p>— L'équipe ARES Dashboard</p>
    `,
  })
  if (ok) {
    console.log(`Email de bienvenue envoyé à ${TO_EMAIL}`)
  } else {
    console.error('Échec de l\'envoi (vérifier Resend ou SMTP)')
    process.exit(1)
  }
}

main()
