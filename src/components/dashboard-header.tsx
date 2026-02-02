'use client'

import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

export function DashboardHeader() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border backdrop-blur">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <Breadcrumbs />
      </div>
    </header>
  )
}
