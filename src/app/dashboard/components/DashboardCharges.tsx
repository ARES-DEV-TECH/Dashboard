'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

const COLORS = ['#667eea', '#6366f1', '#9333ea', '#8b5cf6', '#94a3b8', '#64748b']

export interface ChargesTotals {
  breakdown?: { recurring: number; oneTime: number }
}

export interface ChargesBreakdownItem {
  category: string
  recurring: number
  oneTime: number
  total: number
}

export interface ChargesDetailItem {
  category: string
  recurring: number
  oneTime: number
  total: number
}

export function DashboardCharges({
  totals,
  breakdown,
  detailList,
}: {
  totals: ChargesTotals | null
  breakdown: ChargesBreakdownItem[]
  detailList: ChargesDetailItem[]
}) {
  const typeData = [
    { name: 'Récurrentes', value: totals?.breakdown?.recurring ?? 0 },
    { name: 'Ponctuelles', value: totals?.breakdown?.oneTime ?? 0 },
  ].filter((d) => d.value > 0)

  const catData = breakdown
    .filter((d) => (d.total ?? 0) > 0)
    .map((d) => ({ name: d.category?.trim() || 'Sans catégorie', value: d.total }))

  const formatEur = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">💸 Analyse des Charges</h2>
        <div className="h-1 w-12 sm:w-16 bg-accent rounded-full shrink-0" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📋</span>
              <span>Résumé des Charges</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-primary/15 rounded-lg border-l-4 border-primary">
                <div>
                  <span className="font-semibold text-primary-foreground">Récurrentes</span>
                  <p className="text-sm text-muted-foreground">Charges mensuelles/annuelles</p>
                </div>
                <span className="text-foreground font-bold text-lg">
                  {(totals?.breakdown?.recurring ?? 0).toLocaleString()}€
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-accent/15 rounded-lg border-l-4 border-accent">
                <div>
                  <span className="font-semibold text-accent-foreground">Ponctuelles</span>
                  <p className="text-sm text-muted-foreground">Charges uniques</p>
                </div>
                <span className="text-foreground font-bold text-lg">
                  {(totals?.breakdown?.oneTime ?? 0).toLocaleString()}€
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>🎯</span>
              <span>Répartition par Type</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            {typeData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Aucune charge sur la période
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart margin={{ top: 5, right: 60, bottom: 55, left: 60 }}>
                  <Pie
                    data={typeData}
                    nameKey="name"
                    dataKey="value"
                    cx="50%"
                    cy="45%"
                    outerRadius={65}
                    label={((props: { percent?: number }) => `${((props.percent ?? 0) * 100).toFixed(0)}%`) as import('recharts').PieLabel}
                    labelLine={typeData.length > 1}
                  >
                    {typeData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#667eea' : '#9333ea'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#f1f5f9',
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                    formatter={(value: number) => [formatEur(value), 'Charges']}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-visible">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📂</span>
              <span>Répartition par Catégorie</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            {catData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
                Aucune charge par catégorie sur la période
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart margin={{ top: 5, right: 60, bottom: 55, left: 60 }}>
                  <Pie
                    data={catData}
                    nameKey="name"
                    dataKey="value"
                    cx="50%"
                    cy="45%"
                    outerRadius={65}
                    label={((props: { percent?: number }) => `${((props.percent ?? 0) * 100).toFixed(0)}%`) as import('recharts').PieLabel}
                    labelLine={catData.length > 1}
                  >
                    {catData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#f1f5f9',
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                    formatter={(value: number) => [formatEur(value), 'Charges']}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📋</span>
            <span>Détail des Catégories</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {detailList.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-border"
              >
                <span className="font-medium text-foreground">{item.category}</span>
                <span className="font-bold text-foreground">{item.total.toLocaleString()}€</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
