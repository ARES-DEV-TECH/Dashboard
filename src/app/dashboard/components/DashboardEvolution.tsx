'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface MonthlyEvolutionItem {
  month: number
  monthName: string
  sales: { count: number; totalHt: number; totalTtc: number; linkedCount: number }
  charges: { count: number; totalHt: number; totalTtc: number; linkedCount: number; crossLinkedCount: number }
  result: number
}

export interface EvolutionDataProps {
  year: number
  monthlyEvolution: MonthlyEvolutionItem[]
}

export function DashboardEvolution({ evolutionData }: { evolutionData: EvolutionDataProps }) {
  const { year, monthlyEvolution } = evolutionData

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">📈 Évolution Temporelle</h2>
        <div className="h-1 w-12 sm:w-16 bg-accent rounded-full shrink-0" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2 min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📊</span>
              <span>Vue d&apos;ensemble {year}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">CA, charges et résultat par mois</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="monthName" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  tickFormatter={(value) => `€${value.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f1f5f9',
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                  formatter={(value: number | undefined, name?: string) => [
                    new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(value ?? 0),
                    (name === 'sales.totalHt' ? 'CA HT' : name === 'charges.totalHt' ? 'Charges HT' : name === 'result' ? 'Résultat' : name) ?? '',
                  ]}
                />
                <Line type="monotone" dataKey="sales.totalHt" stroke="#667eea" strokeWidth={3} name="CA HT" />
                <Line type="monotone" dataKey="charges.totalHt" stroke="#6366f1" strokeWidth={3} name="Charges HT" />
                <Line type="monotone" dataKey="result" stroke="#9333ea" strokeWidth={3} name="Résultat" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>💰</span>
              <span>Rentabilité {year}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">Focus sur le résultat mensuel</p>
          </CardHeader>
          <CardContent className="min-w-0">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="monthName" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickFormatter={(value) => `€${value.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#f1f5f9',
                  }}
                  labelStyle={{ color: '#f1f5f9' }}
                  formatter={(value: number | undefined) => [
                    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value ?? 0),
                    'Résultat HT',
                  ]}
                />
                <Line type="monotone" dataKey="result" stroke="#9333ea" strokeWidth={4} name="Résultat HT" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
