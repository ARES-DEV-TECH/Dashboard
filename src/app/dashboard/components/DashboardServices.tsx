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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

const COLORS = ['#667eea', '#6366f1', '#9333ea', '#8b5cf6', '#94a3b8', '#64748b']

export interface ServiceDistributionItem {
  name: string
  value: number
}

export interface ServiceAnalysisItem {
  serviceName: string
  unitPrice: number
  salesCount: number
  salesTotal: number
  chargesCount: number
  chargesTotal: number
  linkedClients: number
}

export interface ClientAnalysisItem {
  clientName: string
  contactPerson: string
  salesCount: number
  salesTotal: number
  chargesCount: number
  chargesTotal: number
  linkedServices: number
}

export interface MonthlyServiceEvolutionItem {
  monthName: string
  [serviceName: string]: string | number
}

export function DashboardServices({
  serviceDistribution,
  monthlyServiceEvolution,
  serviceAnalysis,
  clientAnalysis,
}: {
  serviceDistribution: ServiceDistributionItem[]
  monthlyServiceEvolution?: MonthlyServiceEvolutionItem[] | null
  serviceAnalysis?: ServiceAnalysisItem[]
  clientAnalysis?: ClientAnalysisItem[]
}) {
  const filteredServices = serviceDistribution.filter((d) => (d.value ?? 0) > 0)
  const formatEur = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">🛠️ Analyse des Services</h2>
          <div className="h-1 w-12 sm:w-16 bg-accent rounded-full shrink-0" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📊</span>
                <span>Répartition CA par Service</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">Part de chaque service dans le CA total</p>
            </CardHeader>
            <CardContent className="overflow-visible">
              {filteredServices.length === 0 ? (
                <div className="flex items-center justify-center h-64 bg-muted/30 rounded-xl border border-border">
                  <div className="text-center">
                    <div className="text-muted-foreground text-lg mb-2">📊</div>
                    <p className="text-foreground">Aucune donnée de service disponible</p>
                    <p className="text-sm text-muted-foreground">Ajoutez des ventes pour voir la répartition</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart margin={{ top: 5, right: 60, bottom: 55, left: 60 }}>
                    <Pie
                      data={filteredServices as { name: string; value: number }[]}
                      nameKey="name"
                      dataKey="value"
                      cx="50%"
                      cy="45%"
                      outerRadius={65}
                      label={((props: { percent?: number }) => `${((props.percent ?? 0) * 100).toFixed(0)}%`) as import('recharts').PieLabel}
                      labelLine={filteredServices.length > 1}
                    >
                      {filteredServices.map((_, index) => (
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
                      formatter={(value: number) => [formatEur(value), 'CA HT']}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>📈</span>
                <span>CA par Service avec courbes</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">Évolution du CA par service sur l&apos;année</p>
            </CardHeader>
            <CardContent>
              {monthlyServiceEvolution && serviceAnalysis && serviceAnalysis.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyServiceEvolution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis
                      tick={{ fontSize: 10 }}
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
                      formatter={(value: number, name: string) => [formatEur(value), name]}
                    />
                    {serviceAnalysis.map((service, index) => (
                      <Line
                        key={service.serviceName}
                        type="monotone"
                        dataKey={service.serviceName}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        name={service.serviceName}
                        dot={{ r: 4 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 bg-muted/30 rounded-xl border border-border">
                  <div className="text-center">
                    <div className="text-muted-foreground text-lg mb-2">📈</div>
                    <p className="text-foreground">Aucune donnée d&apos;évolution disponible</p>
                    <p className="text-sm text-muted-foreground">Ajoutez des ventes pour voir l&apos;évolution</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {serviceAnalysis && serviceAnalysis.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-foreground">🔗 Services Liés</h2>
            <div className="h-0.5 w-12 bg-primary/50 rounded-full" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {serviceAnalysis.map((service, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground text-sm truncate">{service.serviceName}</h3>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Prix:</span>
                      <span className="font-medium text-foreground">{service.unitPrice?.toFixed(0) || 'N/A'}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ventes:</span>
                      <span className="font-medium text-foreground">{service.salesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CA:</span>
                      <span className="font-medium text-emerald-400">{service.salesTotal?.toFixed(0) || '0'}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Clients:</span>
                      <span className="font-medium text-foreground">{service.linkedClients}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {clientAnalysis && clientAnalysis.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-foreground">👥 Clients Liés</h2>
            <div className="h-0.5 w-12 bg-primary/50 rounded-full" />
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {clientAnalysis.map((client, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground text-sm truncate">{client.clientName}</h3>
                  {client.contactPerson && (
                    <p className="text-xs text-muted-foreground truncate">{client.contactPerson}</p>
                  )}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Ventes:</span>
                      <span className="font-medium text-foreground">{client.salesCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CA:</span>
                      <span className="font-medium text-emerald-400">{client.salesTotal?.toFixed(0) || '0'}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Charges:</span>
                      <span className="font-medium text-red-400">{client.chargesTotal?.toFixed(0) || '0'}€</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Services:</span>
                      <span className="font-medium text-foreground">{client.linkedServices}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
