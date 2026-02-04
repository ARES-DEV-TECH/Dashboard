'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart3, Users, Package, ShoppingCart, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
    { title: 'Accueil', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Clients', url: '/clients', icon: Users },
    { title: 'Articles', url: '/articles', icon: Package },
    { title: 'Ventes', url: '/sales', icon: ShoppingCart },
    { title: 'Charges', url: '/charges', icon: Receipt },
    { title: 'Analyse', url: '/analytics', icon: BarChart3 },
]

export function MobileNav() {
    const pathname = usePathname()

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background/80 backdrop-blur-lg px-2 shadow-[0_-1px_3px_rgba(0,0,0,0.05)] md:hidden">
            {items.map((item) => {
                const isActive = pathname === item.url
                return (
                    <Link
                        key={item.url}
                        href={item.url}
                        className={cn(
                            'flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 transition-colors',
                            isActive
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                    >
                        <item.icon className={cn('h-5 w-5', isActive && 'fill-current/20')} />
                        <span className="text-[10px] font-medium">{item.title}</span>
                    </Link>
                )
            })}
        </div>
    )
}
