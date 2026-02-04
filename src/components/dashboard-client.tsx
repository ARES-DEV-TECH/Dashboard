'use client'

import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { DashboardRecentSalesTable } from '@/components/dashboard-recent-sales-table'
import { SectionCards } from '@/components/section-cards'
import type { DashboardData } from '@/components/dashboard-page-client'

export function DashboardClient({ data, isRefreshing }: { data: DashboardData; isRefreshing?: boolean }) {
  return (
    <div
      className={`@container/main flex flex-1 flex-col gap-3 transition-opacity duration-300 sm:gap-6 ${isRefreshing ? 'opacity-70' : 'opacity-100'
        }`}
    >
      <SectionCards kpis={data.kpis} />

      <div
        className="px-3 lg:px-6"
      >
        <ChartAreaInteractive data={data.evolution} />
      </div>

      <div
        className="flex flex-1 flex-col gap-3 px-3 pb-8 lg:px-6 sm:gap-4"
      >
        <h3 className="font-semibold px-1">Ventes récentes</h3>
        <DashboardRecentSalesTable data={data.recentSales} />
      </div>
    </div>
  )
}
