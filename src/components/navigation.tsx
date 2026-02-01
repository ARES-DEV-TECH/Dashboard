'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from './auth-provider'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, Package, ShoppingCart, CreditCard, Settings, LogOut } from 'lucide-react'

const mainNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Articles', href: '/articles', icon: Package },
  { name: 'Ventes', href: '/sales', icon: ShoppingCart },
  { name: 'Charges', href: '/charges', icon: CreditCard },
]

const secondaryNav = [
  { name: 'Paramètres', href: '/settings', icon: Settings },
]

export function Navigation() {
  return (<><NavLinks /><UserMenu /></>)
}

export function NavLinks() {
  const pathname = usePathname()
  const router = useRouter()

  const linkClass = (isActive: boolean) =>
    cn(
      'sidebar-nav-item flex items-center gap-4 w-full px-4 py-3 rounded-xl text-base font-medium',
      isActive
        ? 'sidebar-nav-item-active bg-sidebar-primary text-sidebar-primary-foreground'
        : 'text-sidebar-foreground/90 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground active:bg-sidebar-accent/70'
    )

  return (
    <div className="w-full px-4 pt-6">
      {/* Section principale */}
      <div className="mb-6">
        <p className="sidebar-section-label px-4 mb-5 text-sm font-semibold uppercase text-sidebar-foreground/45">
          Menu
        </p>
        <ul className="space-y-2" role="list">
          {mainNav.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  prefetch
                  onMouseEnter={() => router.prefetch(item.href)}
                  className={linkClass(isActive)}
                >
                  <item.icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                  <span className="truncate">{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Section secondaire */}
      <div>
        <p className="sidebar-section-label px-4 mb-5 text-sm font-semibold uppercase text-sidebar-foreground/45">
          Compte
        </p>
        <ul className="space-y-2" role="list">
          {secondaryNav.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  prefetch
                  onMouseEnter={() => router.prefetch(item.href)}
                  className={linkClass(isActive)}
                >
                  <item.icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
                  <span className="truncate">{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export function UserMenu() {
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <div className="w-full flex flex-col mt-auto">
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        className="w-full justify-start gap-4 h-11 px-4 rounded-xl border-sidebar-border/80 bg-transparent text-base text-sidebar-foreground/90 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:border-sidebar-border transition-colors"
      >
        <LogOut className="h-4 w-4 shrink-0" aria-hidden />
        Déconnexion
      </Button>
    </div>
  )
}
