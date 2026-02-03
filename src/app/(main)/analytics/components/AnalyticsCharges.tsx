'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface AnalyticsChargesProps {
  data: {
    breakdown: any[]
    totals: any
  }
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#8b5cf6', '#0ea5e9', '#64748b']

export function AnalyticsCharges({ data }: AnalyticsChargesProps) {
  const { breakdown, totals } = data

  // Préparer les données pour le graphique (top 5 + autres)
  const chartData = breakdown
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(item => ({
      name: item.category || 'Non catégorisé',
      value: item.total
    }))

  const otherTotal = breakdown
    .sort((a, b) => b.total - a.total)
    .slice(5)
    .reduce((sum, item) => sum + item.total, 0)

  if (otherTotal > 0) {
    chartData.push({ name: 'Autres', value: otherTotal })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Tableau détaillé */}
        <Card className="col-span-4 order-2 lg:order-1">
          <CardHeader>
            <CardTitle>Détail des Charges</CardTitle>
            <CardDescription>Par catégorie de dépense</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Récurrent</TableHead>
                  <TableHead className="text-right">Ponctuel</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.category || 'Non catégorisé'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(item.recurring)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(item.oneTime)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(item.total)}
                    </TableCell>
                  </TableRow>
                ))}
                {breakdown.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                      Aucune charge sur cette période
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Graphique */}
        <Card className="col-span-3 order-1 lg:order-2">
          <CardHeader>
            <CardTitle>Répartition des Dépenses</CardTitle>
            <CardDescription>Top catégories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {totals && (
              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">Total des charges</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totals.totalHt ?? totals.totalTtc ?? 0)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
