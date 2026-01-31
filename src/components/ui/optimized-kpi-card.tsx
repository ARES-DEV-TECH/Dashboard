import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface OptimizedKpiCardProps {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: React.ComponentType<any>
}

export const OptimizedKpiCard = React.memo<OptimizedKpiCardProps>(({
  title,
  value,
  change,
  changeType,
  icon: Icon
}) => {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-emerald-400 bg-emerald-500/20'
      case 'negative':
        return 'text-red-400 bg-red-500/20'
      default:
        return 'text-muted-foreground bg-muted'
    }
  }

  const getChangeIcon = () => {
    switch (changeType) {
      case 'positive':
        return <TrendingUp className="h-4 w-4" />
      case 'negative':
        return <TrendingDown className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className={`text-xs ${getChangeColor()} inline-flex items-center px-2 py-1 rounded-full mt-2`}>
          {getChangeIcon()}
          <span className="ml-1">{change}</span>
        </p>
      </CardContent>
    </Card>
  )
})

OptimizedKpiCard.displayName = 'OptimizedKpiCard'
