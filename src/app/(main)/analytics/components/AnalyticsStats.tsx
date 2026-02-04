'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Landmark, TrendingUp, TrendingDown, Percent, AlertCircle, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'

interface AnalyticsStatsProps {
  fiscalData: {
    urssaf: {
      baseAmount: number
      rate: number
      amount: number
    }
    tva: {
      collected: number
      deductible: number
      net: number
    }
    pending?: {
      amount: number
    }
  }
}

export function AnalyticsStats({ fiscalData }: AnalyticsStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* URSSAF */}
      <Card className="relative overflow-hidden transition-all hover:shadow-md border-primary/10 bg-background/60 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Cotisations URSSAF</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full text-muted-foreground hover:text-foreground">
                  <Info className="h-3 w-3" />
                  <span className="sr-only">Info URSSAF</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Calculé sur le CA encaissé HT.</p>
                <p>Taux actuel : {fiscalData.urssaf.rate}%</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Landmark className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-2xl font-bold">{formatCurrency(fiscalData.urssaf.amount)}</div>
          <p className="text-xs text-muted-foreground">
            Basé sur {fiscalData.urssaf.rate}% du CA encaissé
          </p>
          <div className="mt-4 pt-4 border-t text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assiette (CA HT)</span>
              <span>{formatCurrency(fiscalData.urssaf.baseAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TVA Collectée */}
      <Card className="relative overflow-hidden transition-all hover:shadow-md border-primary/10 bg-background/60 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">TVA Collectée</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full text-muted-foreground hover:text-foreground">
                  <Info className="h-3 w-3" />
                  <span className="sr-only">Info TVA</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total de la TVA facturée sur vos ventes.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-2xl font-bold">{formatCurrency(fiscalData.tva.collected)}</div>
          <p className="text-xs text-muted-foreground">
            TVA facturée aux clients
          </p>
        </CardContent>
      </Card>

      {/* TVA à décaisser */}
      <Card className="relative overflow-hidden transition-all hover:shadow-md border-primary/10 bg-background/60 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Solde TVA (Estimé)</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full text-muted-foreground hover:text-foreground">
                  <Info className="h-3 w-3" />
                  <span className="sr-only">Info Solde TVA</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>TVA Collectée - TVA Déductible (sur charges).</p>
                <p>C'est ce que vous devez reverser.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-2xl font-bold">{formatCurrency(fiscalData.tva.net)}</div>
          <p className="text-xs text-muted-foreground">
            Montant à reverser à l'État
          </p>
        </CardContent>
      </Card>

      {/* Impayés / En attente */}
      <Card className="relative overflow-hidden transition-all hover:shadow-md border-primary/10 bg-background/60 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-50 pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Ventes en attente</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full text-muted-foreground hover:text-foreground">
                  <Info className="h-3 w-3" />
                  <span className="sr-only">Info Impayés</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Cumul des factures émises mais non marquées comme "Payée".</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <AlertCircle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent className="relative">
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(fiscalData.pending?.amount || 0)}</div>
          <p className="text-xs text-muted-foreground">
            Montant TTC non encaissé
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
