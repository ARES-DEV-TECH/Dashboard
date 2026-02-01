import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { PageLayout } from '@/components/layout/PageLayout'
import { DashboardWelcome } from './dashboard-welcome'

const DashboardContent = dynamic(() => import('./dashboard-content').then((m) => ({ default: m.DashboardContent })), {
  loading: () => (
    <PageLayout title="Dashboard" className="pb-12 sm:pb-16">
      <Skeleton className="h-5 w-40 mt-1" />
      <div className="space-y-6">
        <div className="flex justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </PageLayout>
  ),
})

export default function DashboardPage() {
  return (
    <PageLayout title="Dashboard" className="pb-12 sm:pb-16">
      <DashboardWelcome />
      <DashboardContent />
    </PageLayout>
  )
}
