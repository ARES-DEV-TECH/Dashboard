'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Raccourcis : D=Dashboard, C=Clients, A=Articles, V=Ventes, H=Charges, P=Paramètres, N=Nouveau (contextuel). Pas de raccourci déconnexion. */
const SHORTCUTS: Record<string, string> = {
  d: '/dashboard',
  c: '/clients',
  a: '/articles',
  v: '/sales',
  h: '/charges',
  p: '/settings',
}

function isInputFocused(): boolean {
  if (typeof document === 'undefined') return false
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  const role = el.getAttribute?.('role')
  const editable = el.getAttribute?.('contenteditable') === 'true'
  return tag === 'input' || tag === 'textarea' || tag === 'select' || role === 'textbox' || editable
}

export function KeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return
      const key = e.key?.toLowerCase()
      if (e.altKey || e.metaKey || e.ctrlKey) return
      if (key === 'n') {
        window.dispatchEvent(new CustomEvent('shortcut-new'))
        return
      }
      const path = key ? SHORTCUTS[key] : undefined
      if (path) {
        e.preventDefault()
        router.push(path)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return null
}
