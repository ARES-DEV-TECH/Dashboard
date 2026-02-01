import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Échappe le HTML pour affichage dans un email (évite XSS dans le client mail). */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
