/**
 * Envoi d'emails : Resend (prioritaire) ou SMTP (ex. Hostinger).
 * Variables Resend : RESEND_API_KEY, RESEND_FROM_EMAIL
 * Variables SMTP : SMTP_HOST, SMTP_PORT (465), SMTP_USER, SMTP_PASSWORD, SMTP_FROM (expéditeur)
 */

export type SendEmailOptions = {
  to: string
  subject: string
  html: string
  from?: string
}

async function sendViaResend(options: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return false
  const from = options.from || process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('Resend error:', res.status, err)
    return false
  }
  return true
}

async function sendViaSmtp(options: SendEmailOptions): Promise<boolean> {
  const host = process.env.SMTP_HOST?.trim()
  if (!host) return false
  const port = parseInt(process.env.SMTP_PORT?.trim() || '465', 10)
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASSWORD?.trim()
  const from = options.from || process.env.SMTP_FROM?.trim() || user
  if (!user || !pass || !from) return false

  const nodemailer = await import('nodemailer')
  // Port 465 = SSL, port 587 = STARTTLS (Hostinger supporte les deux)
  const secure = port === 465
  const transporter = nodemailer.default.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  })
  try {
    await transporter.sendMail({
      from: `ARES Dashboard <${from}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
    return true
  } catch (err) {
    console.error('SMTP error:', err)
    return false
  }
}

/**
 * Envoie un email. Utilise Resend si RESEND_API_KEY est défini, sinon SMTP si SMTP_HOST est défini.
 * Retourne true si l'email a été envoyé, false sinon (config manquante ou erreur).
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const sent = await sendViaResend(options)
  if (sent) return true
  return sendViaSmtp(options)
}

/** Indique si au moins un transport (Resend ou SMTP) est configuré. */
export function isEmailConfigured(): boolean {
  if (process.env.RESEND_API_KEY?.trim()) return true
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASSWORD?.trim()
  if (host && user && pass) return true
  return false
}
