import { AnalyticsContent } from './analytics-content'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics | Preset',
  description: 'Analyses détaillées et données fiscales',
}

export default function AnalyticsPage() {
  return <AnalyticsContent />
}
