'use client'

import {
  TrendingDown,
  TrendingUp,
  Euro,
  Wallet,
  PieChart,
  Users,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { KPI_TOOLTIPS } from '@/lib/copy/tooltips'
import type { DashboardData } from '@/components/dashboard-page-client'

export function SectionCards({ kpis }: { kpis: DashboardData['kpis'] }) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value)

  const cards = [
    {
      title: 'CA HT',
      value: formatCurrency(kpis.caHt.value),
      change: kpis.caHt.change,
      trend: kpis.caHt.trend,
      icon: Euro,
      description: 'vs période précédente',
      tooltip: KPI_TOOLTIPS.caHt,
    },
    {
      title: 'Charges',
      value: formatCurrency(kpis.charges.value),
      change: kpis.charges.change,
      trend: kpis.charges.trend,
      icon: Wallet,
      description: 'vs période précédente',
      tooltip: KPI_TOOLTIPS.charges,
    },
    {
      title: 'Résultat Net',
      value: formatCurrency(kpis.resultNet.value),
      change: kpis.resultNet.change,
      trend: kpis.resultNet.trend,
      icon: PieChart,
      description: 'Après charges & URSSAF',
      tooltip: KPI_TOOLTIPS.resultNet,
    },
    {
      title: 'Marge Moyenne',
      value: new Intl.NumberFormat('fr-FR', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(kpis.margin.value / 100),
      change: kpis.margin.change,
      trend: kpis.margin.trend,
      icon: Users,
      description: 'Rentabilité globale',
      tooltip: KPI_TOOLTIPS.margin,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 px-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 lg:px-6">
      {cards.map((card, i) => (
        <Card key={i}>
          <CardHeader className="relative">
            <div className="flex items-center gap-1.5">
              <CardDescription>{card.title}</CardDescription>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label="Information"
                  >
                    <Info className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[260px]">
                  {card.tooltip}
                </TooltipContent>
              </Tooltip>
            </div>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {card.value}
            </CardTitle>
            {card.change !== undefined && (
              <div className="absolute right-4 top-4">
                <Badge
                  variant="outline"
                  className={`flex gap-1 rounded-lg text-xs ${
                    card.trend === 'up'
                      ? 'border-green-500/20 bg-green-500/10 text-green-600'
                      : card.trend === 'down'
                        ? 'border-red-500/20 bg-red-500/10 text-red-600'
                        : 'text-muted-foreground'
                  }`}
                >
                  {card.trend === 'up' ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {card.change > 0 ? '+' : ''}
                  {card.change}%
                </Badge>
              </div>
            )}
          </CardHeader>
          <CardFooter className="flex flex-col items-start gap-1 text-sm">
            <div className="text-muted-foreground">{card.description}</div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
