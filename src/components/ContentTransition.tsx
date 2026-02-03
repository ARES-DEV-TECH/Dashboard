'use client'

import { useState, useEffect } from 'react'

/**
 * Transition fluide loading → contenu : crossfade entre skeleton et contenu.
 * Évite le swap brutal quand les données arrivent.
 */
export function ContentTransition({
  isLoading,
  loadingComponent,
  children,
  className,
}: {
  isLoading: boolean
  loadingComponent: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const [showLoader, setShowLoader] = useState(isLoading)
  const [showContent, setShowContent] = useState(!isLoading)

  useEffect(() => {
    if (isLoading) {
      setShowLoader(true)
      setShowContent(false)
    } else {
      setShowContent(true)
      // Suppression du délai artificiel pour une réactivité maximale
      setShowLoader(false)
    }
  }, [isLoading])

  return (
    <div className={`relative min-h-[120px] ${className ?? ''}`}>
      {showLoader && (
        <div
          className={`absolute inset-0 ${!isLoading ? 'animate-fade-out pointer-events-none' : ''}`}
          aria-hidden={!isLoading}
        >
          {loadingComponent}
        </div>
      )}
      {showContent && (
        <div className={isLoading ? 'opacity-0' : 'animate-fade-in'}>
          {children}
        </div>
      )}
    </div>
  )
}
