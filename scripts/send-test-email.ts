#!/usr/bin/env npx tsx
/**
 * Test d'envoi d'email vers une ou plusieurs adresses.
 * Usage : npx tsx scripts/send-test-email.ts
 * Prérequis : RESEND_API_KEY (et optionnel RESEND_FROM_EMAIL) dans .env.local
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

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

const TEST_EMAILS = ['djerbi00@gmail.com', 'contact@arezkidjerbi.fr']

async function main() {
  const { sendEmail, isEmailConfigured } = await import('../src/lib/email')
  if (!isEmailConfigured()) {
    console.error('Aucun transport email configuré (RESEND_API_KEY ou SMTP_*).')
    process.exit(1)
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev'
  console.log('Expéditeur utilisé (from):', from)
  console.log('Clé Resend présente:', !!process.env.RESEND_API_KEY?.trim())
  console.log('')

  const subject = 'Test ARES Dashboard – envoi d’email'
  const html = `
    <p>Bonjour,</p>
    <p>Ceci est un <strong>test d’envoi</strong> depuis ARES Dashboard.</p>
    <p>Si vous recevez ce message, la configuration email (Resend ou SMTP) fonctionne correctement.</p>
    <p>— L’équipe ARES Dashboard</p>
  `

  let anyFailed = false
  for (const to of TEST_EMAILS) {
    const ok = await sendEmail({ to, subject, html })
    if (ok) {
      console.log('OK : email envoyé à', to)
    } else {
      console.error('Échec : envoi à', to)
      anyFailed = true
    }
  }

  if (anyFailed && from.includes('arezkidjerbi.fr')) {
    console.log('')
    console.log('--- Test avec expéditeur Resend de test (onboarding@resend.dev) ---')
    const testWithOnboarding = await sendEmail({
      to: 'contact@arezkidjerbi.fr',
      subject: 'Test Resend – clé API',
      html: '<p>Si tu reçois ce mail, ta clé Resend est valide. Le 403 vient du fait que le domaine arezkidjerbi.fr n’est pas reconnu pour cette clé.</p>',
      from: 'onboarding@resend.dev',
    })
    if (testWithOnboarding) {
      console.log('OK avec onboarding@resend.dev → contact@arezkidjerbi.fr (vérifie ta boîte).')
      console.log('')
      console.log('→ La clé API fonctionne, mais le domaine arezkidjerbi.fr n’est PAS vérifié pour CE compte Resend.')
      console.log('→ Utilise la clé API du compte Resend où tu vois arezkidjerbi.fr en "Verified" (Domains).')
      console.log('→ Ou connecte-toi sur https://resend.com avec le compte de cette clé et vérifie le domaine là.')
    } else {
      console.log('Échec aussi avec onboarding@resend.dev.')
      console.log('→ Vérifie RESEND_API_KEY (clé valide, pas révoquée).')
    }
  }
}

main()
