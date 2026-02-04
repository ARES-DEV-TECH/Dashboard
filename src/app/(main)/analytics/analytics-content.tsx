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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useIsMobile } from '@/hooks/use-mobile'

export function AnalyticsContent() {
  const [dateRange, setDateRange] = useState<DateRange>(() => calculatePresetDates('thisMonth'))
  const { payload, isLoading, isValidating } = useAnalyticsData(dateRange)
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState('services')

  return (
    <div className="flex flex-1 flex-col gap-3 p-4 pt-0 sm:gap-6">
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              {isMobile ? (
                <div className="w-full">
                  <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir une vue" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="services">Analyse Services</SelectItem>
                      <SelectItem value="charges">Analyse Charges</SelectItem>
                      <SelectItem value="clients">Clients & Revenus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 no-scrollbar">
                  <TabsList className="w-auto inline-flex justify-start h-auto p-1">
                    <TabsTrigger value="services" className="py-2.5">Analyse Services</TabsTrigger>
                    <TabsTrigger value="charges" className="py-2.5">Analyse Charges</TabsTrigger>
                    <TabsTrigger value="clients" className="py-2.5">Clients & Revenus</TabsTrigger>
                  </TabsList>
                </div>
              )}

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
