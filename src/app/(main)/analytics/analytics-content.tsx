'use client'

import { useState } from 'react'
import { PresetHeader } from '@/components/preset-header'
import { ContentTransition } from '@/components/ContentTransition'
import { calculatePresetDates, type DateRange } from '@/lib/date-utils'
import { useAnalyticsData } from './use-analytics-data'
import { AnalyticsServices } from './components/AnalyticsServices'
import { AnalyticsCharges } from './components/AnalyticsCharges'
import { AnalyticsStats } from './components/AnalyticsStats'
import { AnalyticsClients } from './components/AnalyticsClients'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AnalyticsLoading from './loading'

export function AnalyticsContent() {
  const [dateRange, setDateRange] = useState<DateRange>(() => calculatePresetDates('thisMonth'))
  const { payload, isLoading, isValidating } = useAnalyticsData(dateRange)

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      <PresetHeader
        title="Analytics"
        description="Analyse détaillée de votre activité, services, charges et fiscalité."
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        isLoading={isValidating}
      />

      <ContentTransition
        isLoading={isLoading}
        loadingComponent={<AnalyticsLoading />}
        className="min-h-0"
      >
        {payload ? (
          <div className="space-y-6">
            {/* Section KPI Fiscaux */}
            <AnalyticsStats fiscalData={payload.fiscalData} />

            {/* Onglets pour les analyses détaillées */}
            <Tabs defaultValue="services" className="space-y-4">
              <TabsList>
                <TabsTrigger value="services">Analyse Services</TabsTrigger>
                <TabsTrigger value="charges">Analyse Charges</TabsTrigger>
                <TabsTrigger value="clients">Clients & Revenus</TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="space-y-4">
                <AnalyticsServices
                  data={{
                    serviceDistribution: payload.servicesData.serviceDistribution,
                    serviceAnalysis: payload.servicesData.serviceAnalysis || []
                  }}
                />
              </TabsContent>

              <TabsContent value="charges" className="space-y-4">
                <AnalyticsCharges
                  data={{
                    breakdown: payload.chargesData.breakdown,
                    totals: payload.chargesData.totals
                  }}
                />
              </TabsContent>

              <TabsContent value="clients" className="space-y-4">
                <AnalyticsClients
                  data={{
                    clientAnalysis: payload.servicesData.clientAnalysis || [],
                    revenueDistribution: payload.servicesData.revenueDistribution || { recurring: 0, oneTime: 0 }
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="min-h-[400px]" />
        )}
      </ContentTransition>
    </div>
  )
}
