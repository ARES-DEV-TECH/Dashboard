'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Barre de progression fine en haut de page pendant la navigation client-side.
 * Donne un retour visuel immédiat au clic sur un lien (fluidité perçue).
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 400)
    return () => clearTimeout(t)
  }, [pathname])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-primary opacity-90"
      role="progressbar"
      aria-hidden="true"
      style={{
        animation: 'navigation-progress 0.4s ease-out',
      }}
    />
  )
}
