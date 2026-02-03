'use client'

import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { DashboardRecentSalesTable } from '@/components/dashboard-recent-sales-table'
import { SectionCards } from '@/components/section-cards'
import type { DashboardData } from '@/components/dashboard-page-client'

export function DashboardClient({ data }: { data: DashboardData }) {
  return (
    <div className="@container/main flex flex-1 flex-col gap-6">
      <SectionCards kpis={data.kpis} />
      
      <div
        className="animate-fade-in-up px-4 opacity-0 lg:px-6"
        style={{ animationDelay: '280ms' }}
      >
        <ChartAreaInteractive data={data.evolution} />
      </div>

      <div
        className="animate-fade-in-up flex flex-1 flex-col gap-4 px-4 pb-8 opacity-0 lg:px-6"
        style={{ animationDelay: '340ms' }}
      >
        <h3 className="font-semibold">Ventes récentes</h3>
        <DashboardRecentSalesTable data={data.recentSales} />
      </div>
    </div>
  )
}
