'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

interface AnalyticsServicesProps {
  data: {
    serviceDistribution: any[]
    serviceAnalysis: any[]
  }
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6']

export function AnalyticsServices({ data }: AnalyticsServicesProps) {
  const { serviceDistribution, serviceAnalysis } = data

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Graphique de distribution */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Répartition du Chiffre d'Affaires</CardTitle>
            <CardDescription>Par service sur la période</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {serviceDistribution.map((entry, index) => (
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
          </CardContent>
        </Card>

        {/* Tableau détaillé */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Détail par Service</CardTitle>
            <CardDescription>Performance et métriques</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Ventes</TableHead>
                  <TableHead className="text-right">CA HT</TableHead>
                  <TableHead className="text-right">% Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceAnalysis?.map((service, index) => {
                  const totalCa = serviceAnalysis.reduce((acc, s) => acc + s.salesTotal, 0)
                  const percent = totalCa > 0 ? (service.salesTotal / totalCa) * 100 : 0
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-2 w-2 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          {service.serviceName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{service.salesCount}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(service.salesTotal)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {percent.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
