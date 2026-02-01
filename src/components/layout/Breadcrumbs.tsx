'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

/** Libellés génériques pour les segments d’URL (pas de noms, IDs ou filtres sensibles). */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  articles: 'Articles',
  sales: 'Ventes',
  charges: 'Charges',
  settings: 'Paramètres',
}

/** Pour tout segment dynamique (ex. nom client, n° facture), on affiche un libellé générique. */
const GENERIC_DETAIL_LABEL = 'Fiche'

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const items: { href: string; label: string; isLast: boolean }[] = []
  let href = ''

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    href += `/${segment}`
    const label =
      i === 0 ? SEGMENT_LABELS[segment] ?? segment : GENERIC_DETAIL_LABEL
    items.push({ href, label, isLast: i === segments.length - 1 })
  }

  return (
    <nav
      aria-label="Fil d'Ariane"
      className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 sm:mb-4"
    >
      {items.length === 1 && items[0].href === '/dashboard' ? (
        <span className="font-medium text-foreground" aria-current="page">
          Dashboard
        </span>
      ) : (
        <>
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
          >
            Dashboard
          </Link>
          {items.map((item) => (
            <span key={item.href} className="flex items-center gap-1.5">
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground/70"
                aria-hidden
              />
              {item.isLast ? (
                <span
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                >
                  {item.label}
                </Link>
              )}
            </span>
          ))}
        </>
      )}
    </nav>
  )
}
