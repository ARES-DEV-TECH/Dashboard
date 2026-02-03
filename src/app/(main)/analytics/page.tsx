import dynamic from 'next/dynamic'
import type { Metadata } from 'next'
import AnalyticsLoading from './loading'

const AnalyticsContent = dynamic(
  () => import('./analytics-content').then((m) => ({ default: m.AnalyticsContent })),
  { loading: () => <AnalyticsLoading /> }
)

export const metadata: Metadata = {
  title: 'Analytics | Preset',
  description: 'Analyses détaillées et données fiscales',
}

export default function AnalyticsPage() {
  return <AnalyticsContent />
}
