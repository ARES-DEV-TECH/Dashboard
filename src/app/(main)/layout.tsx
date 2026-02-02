import * as React from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <DashboardHeader />
        <main className="flex flex-1 flex-col overflow-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto w-full">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
