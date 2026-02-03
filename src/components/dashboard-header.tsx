'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { useSidebar } from '@/components/ui/sidebar'

export function DashboardHeader() {
  const { setOpenMobile } = useSidebar()

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border backdrop-blur">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        {/* Bouton ouvrir menu (mobile uniquement) — desktop : le trigger est dans la sidebar à la croisée des chemins */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={() => setOpenMobile(true)}
          aria-label="Ouvrir le menu"
          title="Ouvrir le menu"
        >
          <Menu className="size-5" />
        </Button>
        <Breadcrumbs />
      </div>
    </header>
  )
}
