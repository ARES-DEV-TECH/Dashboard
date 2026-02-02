'use client'

import { usePathname } from 'next/navigation'
import { KeyboardShortcuts } from '@/components/KeyboardShortcuts'

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/confirm-email']

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuth = AUTH_PATHS.includes(pathname)

  if (isAuth) {
    return (
      <div id="main-content" tabIndex={-1} className="min-h-dvh">
        {children}
      </div>
    )
  }

  return (
    <>
      <KeyboardShortcuts />
      {children}
    </>
  )
}
