'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import type { DashboardData } from '@/components/dashboard-page-client'

const chartConfig = {
  ca: { label: 'CA HT', color: 'var(--chart-1)' },
  charges: { label: 'Charges', color: 'var(--chart-2)' },
  result: { label: 'Résultat', color: 'var(--chart-3)' },
} satisfies ChartConfig

const PADDING_RATIO = 0.08

function computeYDomain(data: DashboardData['evolution']): [number, number] {
  if (!data?.length) return [0, 0]
  let min = 0
  let max = 0
  for (const d of data) {
    const ca = Number(d.ca) || 0
    const charges = Number(d.charges) || 0
    const result = Number(d.result) ?? 0
    min = Math.min(min, ca, charges, result)
    max = Math.max(max, ca, charges, result)
  }
  const range = Math.max(max - min, 1)
  const padding = Math.max(range * PADDING_RATIO, 10)
  return [min - padding, max + padding]
}

export function ChartAreaInteractive({
  data,
}: {
  data: DashboardData['evolution']
}) {
  const yDomain = React.useMemo(() => computeYDomain(data), [data])
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 space-y-0 border-b py-5 sm:flex-row sm:items-center">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Évolution Temporelle</CardTitle>
          <CardDescription>
            Vue d&apos;ensemble du CA, Charges et Résultat
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <defs>
              <linearGradient id="fillCa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-ca)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-ca)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillCharges" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-charges)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-charges)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillResult" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-result)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-result)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
            <YAxis
              domain={yDomain}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value / 1000}k€`}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(v) => (v as React.ReactNode)} indicator="dot" />}
            />
            <Area dataKey="result" type="natural" fill="url(#fillResult)" stroke="var(--color-result)" stackId="a" />
            <Area dataKey="charges" type="natural" fill="url(#fillCharges)" stroke="var(--color-charges)" stackId="a" />
            <Area dataKey="ca" type="natural" fill="url(#fillCa)" stroke="var(--color-ca)" stackId="a" />
            <ChartLegend
              content={({ payload, verticalAlign }) => (
                <ChartLegendContent
                  payload={payload as Parameters<typeof ChartLegendContent>[0]['payload']}
                  verticalAlign={verticalAlign as Parameters<typeof ChartLegendContent>[0]['verticalAlign']}
                />
              )}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
