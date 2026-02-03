import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return '0,00 €'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Mois courts français pour affichage tableau (ex. 2026-avr-01). */
const TABLE_DATE_MONTHS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc']

/**
 * Formate une date pour l'affichage dans les tableaux : 2026-avr-01
 */
export function formatTableDate(date: Date | string | null | undefined): string {
  if (date == null) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = d.getMonth()
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${TABLE_DATE_MONTHS[m]}-${day}`
}

/** Échappe le HTML pour affichage dans un email (évite XSS dans le client mail). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Retourne les initiales pour un avatar (première lettre du prénom + première lettre du nom).
 * Ex. getInitials('Jean', 'Dupont') → 'JD' ; getInitials('Alex') → 'AL'.
 */
export function getInitials(firstName?: string | null, lastName?: string | null): string {
  if (firstName && lastName) {
    const f = firstName.trim().slice(0, 1)
    const l = lastName.trim().slice(0, 1)
    return (f + l).toUpperCase()
  }
  if (firstName) return firstName.trim().slice(0, 2).toUpperCase()
  if (lastName) return lastName.trim().slice(0, 2).toUpperCase()
  return ''
}

/**
 * Retourne les initiales à partir d'un nom complet (ex. "Jean Dupont" → "JD").
 */
export function getInitialsFromName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase()
  }
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return ''
}

/** Message d'erreur sûr pour affichage (évite [object Event] ou valeurs non string). */
export function safeErrorMessage(value: unknown, fallback = 'Erreur inconnue'): string {
  if (value instanceof Error) return value.message || fallback
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'message' in value && typeof (value as { message?: unknown }).message === 'string')
    return (value as { message: string }).message
  if (value && typeof value === 'object' && 'type' in value) return fallback
  return fallback
}
