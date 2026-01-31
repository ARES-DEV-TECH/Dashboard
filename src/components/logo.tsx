'use client'

import Image from 'next/image'

interface LogoProps {
  /** Hauteur en pixels. Le logo est en ratio 3:2 (paysage), la largeur est calculée automatiquement. Défaut: 36 */
  size?: number
  /** Si true, force un carré (pour favicon / petits usages). Défaut: false */
  square?: boolean
  className?: string
}

/** Ratio du logo portfolio : 1536×1024 = 3:2 */
const LOGO_ASPECT_RATIO = 1536 / 1024 // 1.5

/**
 * Logo optimisé avec next/image (dimensions explicites, pas de surdimensionnement).
 * Pour réduire encore le poids, ajouter une version réduite (ex. 84×56) dans /public/images/ et l’utiliser pour size ≤ 48.
 */
export function Logo({ size = 36, square = false, className = '' }: LogoProps) {
  const height = size
  const width = square ? size : Math.round(size * LOGO_ASPECT_RATIO)
  return (
    <span
      className={`relative block shrink-0 overflow-hidden ${className}`}
      style={{ width, height }}
    >
      <Image
        src="/images/Logo.webp"
        alt="Logo"
        width={width}
        height={height}
        sizes={`${width}px`}
        className="h-full w-full object-contain object-center"
        priority
      />
    </span>
  )
}
