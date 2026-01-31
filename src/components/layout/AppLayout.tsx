'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/logo'
import { NavLinks, UserMenu } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'

const AUTH_PATHS = ['/login', '/register']

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLElement>(null)

  const isAuth = AUTH_PATHS.includes(pathname)

  useEffect(() => setDrawerOpen(false), [pathname])
  useEffect(() => {
    if (!drawerOpen) return
    const close = () => setDrawerOpen(false)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [drawerOpen])

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  useEffect(() => {
    const el = drawerRef.current
    if (!el) return
    if (drawerOpen) {
      el.removeAttribute('inert')
    } else {
      el.setAttribute('inert', '')
    }
  }, [drawerOpen])

  if (isAuth) return <>{children}</>

  return (
    <div className="flex flex-col lg:flex-row min-h-dvh min-h-screen bg-background text-foreground">
      {/* Mobile: barre fixe */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-[100] h-14 flex items-center justify-between px-4 bg-background border-b border-border"
        aria-label="En-tête"
      >
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <Logo size={28} className="shrink-0 rounded" />
          <span className="font-semibold text-foreground truncate">ARES</span>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setDrawerOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu className="size-6" />
        </Button>
      </header>

      {/* Mobile: overlay (clic = fermer) */}
      <button
        type="button"
        className="lg:hidden fixed inset-0 z-[90] bg-black/50 transition-opacity duration-200"
        style={{
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'auto' : 'none',
        }}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
        aria-label="Fermer le menu"
        tabIndex={drawerOpen ? 0 : -1}
      />

      {/* Mobile: tiroir — inert quand fermé pour éviter focus dans contenu caché */}
      <aside
        ref={drawerRef}
        className="lg:hidden fixed top-0 left-0 bottom-0 z-[95] w-[min(280px,85vw)] flex flex-col bg-background border-r border-border shadow-xl transition-transform duration-200 ease-out"
        style={{ transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        aria-hidden={!drawerOpen}
        aria-label="Menu"
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="shrink-0 flex items-center justify-between h-14 px-4 border-b border-border">
            <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setDrawerOpen(false)}>
              <Logo size={28} className="rounded" />
              <span className="font-semibold">ARES</span>
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(false)}
              aria-label="Fermer"
            >
              <X className="size-5" />
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      </aside>

      {/* Desktop: sidebar dans le flux */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-[280px] lg:shrink-0 lg:sticky lg:top-0 lg:h-dvh lg:border-r lg:border-border lg:bg-background"
        aria-label="Navigation"
      >
        <SidebarContent />
      </aside>

      {/* Contenu principal */}
      <main
        className="flex-1 min-w-0 min-h-0 flex flex-col pt-14 lg:pt-0"
        role="main"
      >
        <div className="flex-1 min-h-0 overflow-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="sidebar-content flex flex-col h-full min-h-0 py-4">
      <header className="sidebar-region-header shrink-0 px-4 pb-4 border-b border-border/80">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
          onClick={onNavigate}
        >
          <Logo size={36} className="shrink-0 rounded" />
          <span className="font-bold text-foreground truncate">ARES Dashboard</span>
        </Link>
      </header>
      <div className="sidebar-region-body flex-1 min-h-0 overflow-hidden">
        <nav className="flex-1 min-h-0 overflow-y-auto pt-4" aria-label="Menu">
          <NavLinks />
        </nav>
      </div>
      <footer className="sidebar-region-footer shrink-0 pt-4 border-t border-border/80 px-4">
        <UserMenu />
      </footer>
    </div>
  )
}
