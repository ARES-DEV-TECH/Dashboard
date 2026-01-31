'use client'

import { LucideIcon } from 'lucide-react'
import { OptimizedKpiCard } from '@/components/ui/optimized-kpi-card'

export interface KpiItem {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
}

export function DashboardKPIs({ kpis }: { kpis: KpiItem[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">📊 Indicateurs Clés</h2>
        <div className="h-1 w-12 sm:w-16 bg-primary rounded-full shrink-0" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi, index) => (
          <OptimizedKpiCard
            key={index}
            title={kpi.title}
            value={kpi.value}
            change={kpi.change}
            changeType={kpi.changeType}
            icon={kpi.icon}
          />
        ))}
      </div>
    </div>
  )
}
