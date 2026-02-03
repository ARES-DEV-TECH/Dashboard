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
import { Users, Repeat, CheckCircle } from 'lucide-react'

interface AnalyticsClientsProps {
  data: {
    clientAnalysis: any[]
    revenueDistribution: {
      recurring: number
      oneTime: number
    }
  }
}

const COLORS = ['#8b5cf6', '#0ea5e9'] // Violet (Récurrent), Bleu (Ponctuel)

export function AnalyticsClients({ data }: AnalyticsClientsProps) {
  const { clientAnalysis, revenueDistribution } = data

  const topClients = clientAnalysis.slice(0, 5)
  const totalRevenue = revenueDistribution.recurring + revenueDistribution.oneTime
  
  const chartData = [
    { name: 'Récurrent', value: revenueDistribution.recurring },
    { name: 'Ponctuel', value: revenueDistribution.oneTime },
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Top Clients */}
        <Card className="col-span-4 relative overflow-hidden transition-all hover:shadow-md border-primary/10 bg-background/60 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Top Clients
            </CardTitle>
            <CardDescription>Vos meilleurs clients sur la période</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Ventes</TableHead>
                  <TableHead className="text-right">CA HT</TableHead>
                  <TableHead className="text-right">% Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((client, index) => {
                  const percent = totalRevenue > 0 ? (client.salesTotal / totalRevenue) * 100 : 0
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {client.clientName || 'Inconnu'}
                      </TableCell>
                      <TableCell className="text-right">{client.salesCount}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(client.salesTotal)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {percent.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  )
                })}
                {topClients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                      Aucune donnée disponible
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Répartition Revenus */}
        <Card className="col-span-3 relative overflow-hidden transition-all hover:shadow-md border-primary/10 bg-background/60 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              Structure du Revenu
            </CardTitle>
            <CardDescription>Récurrent vs Ponctuel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
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
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <p className="text-xs text-muted-foreground mb-1">Récurrent</p>
                <p className="text-lg font-bold text-violet-600">
                  {formatCurrency(revenueDistribution.recurring)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20">
                <p className="text-xs text-muted-foreground mb-1">Ponctuel</p>
                <p className="text-lg font-bold text-sky-600">
                  {formatCurrency(revenueDistribution.oneTime)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
