'use client'

import * as React from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, XAxis, YAxis } from 'recharts'
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
import { Checkbox } from '@/components/ui/checkbox'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { DashboardData } from '@/components/dashboard-page-client'

export type EvolutionSeriesKey = 'ca' | 'charges' | 'result'
const ALL_SERIES: EvolutionSeriesKey[] = ['ca', 'charges', 'result']

const chartConfig = {
  ca: { label: 'CA HT', color: 'var(--chart-1)' },
  charges: { label: 'Charges', color: 'var(--chart-2)' },
  result: { label: 'Résultat', color: 'var(--chart-3)' },
} satisfies ChartConfig

const PADDING_RATIO = 0.05

/** Valeurs "belles" possibles pour le max d'axe (ex: 500, 600, 1000, 1200, 1500). */
const NICE_SCALE_OPTIONS = [0.5, 0.6, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

/** Retourne le plus petit "beau" nombre >= value (ex: 1162 → 1200, 521 → 600). */
function niceCeil(value: number): number {
  if (value <= 0) return 100
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
  const normalized = value / magnitude
  for (const opt of NICE_SCALE_OPTIONS) {
    if (opt >= normalized) return opt * magnitude
  }
  return magnitude * 10
}

/** Domaine Y : basé sur le max du CA (Résultat + Charges = CA, on n’empile que ces deux). */
function computeYDomain(
  data: DashboardData['evolution'],
  visibleKeys: EvolutionSeriesKey[]
): [number, number] {
  if (!data?.length || !visibleKeys.length) return [0, 100]
  let minVal = 0
  let maxVal = 0
  for (const d of data) {
    for (const key of visibleKeys) {
      const v = Number((d as Record<string, unknown>)[key]) ?? 0
      minVal = Math.min(minVal, v)
      maxVal = Math.max(maxVal, v)
    }
  }
  const hasNegative = minVal < 0
  const minWithPadding = hasNegative ? minVal * (1 + PADDING_RATIO) : 0
  const maxWithPadding = Math.max(maxVal * (1 + PADDING_RATIO), 10)
  const niceMin = hasNegative ? -niceCeil(Math.abs(minWithPadding)) : 0
  const niceMax = niceCeil(maxWithPadding)
  return [niceMin, niceMax]
}

/** Génère des ticks ronds pour l'axe Y. Si min < 0, couvre [min, max], sinon [0, max]. */
function computeYTicks(min: number, max: number, count = 6): number[] {
  if (max <= 0 && min >= 0) return [0, 100]
  const range = max - min
  if (range <= 0) return [min, max]
  const rawStep = range / count
  const niceStep = rawStep <= 50 ? Math.ceil(rawStep / 10) * 10 : niceCeil(rawStep)
  const ticks: number[] = []
  let v = min
  while (v <= max + 0.01) {
    ticks.push(Math.round(v))
    v += niceStep
  }
  if (ticks[ticks.length - 1] !== max) ticks.push(max)
  const uniq = [...new Set(ticks)].sort((a, b) => a - b)
  if (min < 0 && max > 0 && !uniq.includes(0)) uniq.push(0)
  return uniq.sort((a, b) => a - b)
}

const DOMAIN_TRANSITION_MS = 380
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

/** Retourne un domaine Y interpolé quand la cible change, pour une transition fluide des échelles. */
function useAnimatedYDomain(
  targetDomain: [number, number],
  enabled: boolean
): { domain: [number, number]; ticks: number[] } {
  const [display, setDisplay] = React.useState<{ min: number; max: number }>(() => ({ min: targetDomain[0], max: targetDomain[1] }))
  const prevTarget = React.useRef<[number, number]>(targetDomain)
  const currentDisplayRef = React.useRef(display)
  currentDisplayRef.current = display
  const rafRef = React.useRef<number | undefined>(undefined)

  React.useEffect(() => {
    if (!enabled) {
      setDisplay({ min: targetDomain[0], max: targetDomain[1] })
      prevTarget.current = targetDomain
      return
    }
    const [tMin, tMax] = targetDomain
    if (prevTarget.current[0] === tMin && prevTarget.current[1] === tMax) return

    const start = { min: currentDisplayRef.current.min, max: currentDisplayRef.current.max }
    prevTarget.current = targetDomain
    const startTime = performance.now()

    const tick = () => {
      const elapsed = performance.now() - startTime
      const t = Math.min(elapsed / DOMAIN_TRANSITION_MS, 1)
      const eased = easeOutCubic(t)
      setDisplay({
        min: start.min + (tMin - start.min) * eased,
        max: start.max + (tMax - start.max) * eased,
      })
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [targetDomain[0], targetDomain[1], enabled])

  const displayDomain: [number, number] = [display.min, display.max]
  const displayTicks = React.useMemo(
    () => computeYTicks(display.min, display.max),
    [display.min, display.max]
  )
  return { domain: displayDomain, ticks: displayTicks }
}

/** Clé de montage pour forcer le remontage du graphique aires et déclencher l’animation au passage en vue « Aires ». */
function useAreaChartMountKey(chartType: 'area' | 'bar') {
  const mountKey = React.useRef(0)
  const prevType = React.useRef(chartType)
  if (chartType === 'area' && prevType.current !== 'area') {
    mountKey.current += 1
  }
  prevType.current = chartType
  return chartType === 'area' ? mountKey.current : 0
}

export function ChartAreaInteractive({
  data,
}: {
  data: DashboardData['evolution']
}) {
  const [visibleSeries, setVisibleSeries] = React.useState<EvolutionSeriesKey[]>(['ca', 'charges', 'result'])
  const [chartType, setChartType] = React.useState<'area' | 'bar'>('bar')
  const areaMountKey = useAreaChartMountKey(chartType)

  const handleSeriesChange = (key: EvolutionSeriesKey, checked: boolean) => {
    if (checked) {
      setVisibleSeries((prev) =>
        prev.includes(key) ? prev : (prev.length >= 3 ? [...prev.slice(1), key] : [...prev, key])
      )
    } else {
      setVisibleSeries((prev) => {
        const next = prev.filter((k) => k !== key)
        return next.length === 0 ? prev : next
      })
    }
  }

  const targetY = React.useMemo(() => {
    const [min, max] = computeYDomain(data, visibleSeries)
    return { domain: [min, max] as [number, number], ticks: computeYTicks(min, max) }
  }, [data, visibleSeries])
  const { domain: yDomain, ticks: yTicks } = useAnimatedYDomain(targetY.domain, true)

  const tickFormatter = React.useCallback((value: number) => {
    const n = Number(value)
    const abs = Math.abs(n)
    const sign = n < 0 ? '−' : ''
    if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)} k€`
    return `${sign}${Math.round(abs)} €`
  }, [])

  const showCharges = visibleSeries.includes('charges')
  const showResult = visibleSeries.includes('result')
  const showCa = visibleSeries.includes('ca')
  const canStackArea = showCharges && showResult

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 border-b py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Évolution Temporelle</CardTitle>
          <CardDescription>
            Vue d&apos;ensemble du CA, Charges et Résultat
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Type :</span>
            <ToggleGroup
              type="single"
              value={chartType}
              onValueChange={(v) => v && setChartType(v as 'area' | 'bar')}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="bar" aria-label="Barres">Barres</ToggleGroupItem>
              <ToggleGroupItem value="area" aria-label="Aires">Aires</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Séries (max 3) :</span>
            {ALL_SERIES.map((key) => (
              <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={visibleSeries.includes(key)}
                  onCheckedChange={(c) => handleSeriesChange(key, !!c)}
                  disabled={visibleSeries.length <= 1 && visibleSeries.includes(key)}
                />
                <span
                  style={{ color: key === 'ca' ? 'var(--chart-1)' : key === 'charges' ? 'var(--chart-2)' : 'var(--chart-3)' }}
                >
                  {chartConfig[key].label}
                </span>
              </label>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className={`aspect-auto h-[250px] w-full ${chartType === 'area' ? 'chart-evolution-draw' : ''}`}
        >
          {chartType === 'area' ? (
          <AreaChart key={`area-${data?.length ?? 0}-${areaMountKey}-${JSON.stringify(data[0] || {})}`} data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
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
              ticks={yTicks}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
              tickFormatter={tickFormatter}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(v) => (v as React.ReactNode)} indicator="dot" />}
            />
            {/* Empiler uniquement Charges + Résultat (total = CA) pour que l’échelle Y soit cohérente */}
            {/* Animation dessin gauche→droite gérée en CSS (.chart-evolution-draw) */}
            {canStackArea && (
              <>
                <Area dataKey="charges" type="natural" fill="url(#fillCharges)" stroke="var(--color-charges)" stackId="a" isAnimationActive animationDuration={1500} animationEasing="ease-out" />
                <Area dataKey="result" type="natural" fill="url(#fillResult)" stroke="var(--color-result)" stackId="a" isAnimationActive animationDuration={1500} animationEasing="ease-out" />
              </>
            )}
            {showCa && !canStackArea && (
              <Area dataKey="ca" type="natural" fill="url(#fillCa)" stroke="var(--color-ca)" isAnimationActive animationDuration={1500} animationEasing="ease-out" />
            )}
            {showCa && canStackArea && (
              <Line dataKey="ca" type="monotone" stroke="var(--color-ca)" strokeWidth={2} dot={false} name="CA HT" isAnimationActive animationDuration={1500} animationEasing="ease-out" />
            )}
            {showCharges && !canStackArea && (
              <Area dataKey="charges" type="natural" fill="url(#fillCharges)" stroke="var(--color-charges)" isAnimationActive animationDuration={1500} animationEasing="ease-out" />
            )}
            {showResult && !canStackArea && (
              <Area dataKey="result" type="natural" fill="url(#fillResult)" stroke="var(--color-result)" isAnimationActive animationDuration={1500} animationEasing="ease-out" />
            )}
            <ChartLegend
              content={({ payload, verticalAlign }) => (
                <ChartLegendContent
                  payload={(payload ?? []).filter((p) => visibleSeries.includes((p.dataKey ?? p.value) as EvolutionSeriesKey)) as React.ComponentProps<typeof ChartLegendContent>['payload']}
                  verticalAlign={verticalAlign as Parameters<typeof ChartLegendContent>[0]['verticalAlign']}
                />
              )}
            />
          </AreaChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
            <YAxis
              domain={yDomain}
              ticks={yTicks}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
              tickFormatter={tickFormatter}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(v) => (v as React.ReactNode)} indicator="dot" />}
            />
            {showCharges && <Bar dataKey="charges" fill="var(--color-charges)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-out" />}
            {showResult && <Bar dataKey="result" fill="var(--color-result)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-out" />}
            {showCa && <Bar dataKey="ca" fill="var(--color-ca)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-out" />}
            <ChartLegend
              content={({ payload, verticalAlign }) => (
                <ChartLegendContent
                  payload={(payload ?? []).filter((p) => visibleSeries.includes((p.dataKey ?? p.value) as EvolutionSeriesKey)) as React.ComponentProps<typeof ChartLegendContent>['payload']}
                  verticalAlign={verticalAlign as Parameters<typeof ChartLegendContent>[0]['verticalAlign']}
                />
              )}
            />
          </BarChart>
        )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
