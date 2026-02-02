'use client'

import { useState } from 'react'
import { PresetHeader } from '@/components/preset-header'
import { calculatePresetDates, type DateRange } from '@/lib/date-utils'
import { useAnalyticsData } from './use-analytics-data'
import { AnalyticsServices } from './components/AnalyticsServices'
import { AnalyticsCharges } from './components/AnalyticsCharges'
import { AnalyticsStats } from './components/AnalyticsStats'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : payload ? (
        <div className="space-y-6">
          {/* Section KPI Fiscaux */}
          <AnalyticsStats fiscalData={payload.fiscalData} />

          {/* Onglets pour les analyses détaillées */}
          <Tabs defaultValue="services" className="space-y-4">
            <TabsList>
              <TabsTrigger value="services">Analyse Services</TabsTrigger>
              <TabsTrigger value="charges">Analyse Charges</TabsTrigger>
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
          </Tabs>
        </div>
      ) : null}
    </div>
  )
}
