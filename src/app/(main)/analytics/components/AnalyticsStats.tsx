'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Landmark, TrendingUp, TrendingDown, Percent, AlertCircle } from 'lucide-react'

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* URSSAF */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cotisations URSSAF</CardTitle>
          <Landmark className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">TVA Collectée</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(fiscalData.tva.collected)}</div>
          <p className="text-xs text-muted-foreground">
            TVA facturée aux clients
          </p>
        </CardContent>
      </Card>

      {/* TVA à décaisser */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Solde TVA (Estimé)</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(fiscalData.tva.net)}</div>
          <p className="text-xs text-muted-foreground">
            Montant à reverser à l'État
          </p>
        </CardContent>
      </Card>

      {/* Impayés / En attente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ventes en attente</CardTitle>
          <AlertCircle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(fiscalData.pending?.amount || 0)}</div>
          <p className="text-xs text-muted-foreground">
            Montant TTC non encaissé
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
