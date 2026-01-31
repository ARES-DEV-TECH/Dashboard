import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { DashboardWelcome } from './dashboard-welcome'

const DashboardContent = dynamic(() => import('./dashboard-content').then((m) => ({ default: m.DashboardContent })), {
  loading: () => (
    <div className="w-full min-w-0 py-4 sm:py-6 pb-12 sm:pb-16 space-y-4 sm:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
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
    </div>
  ),
})

export default function DashboardPage() {
  return (
    <div className="w-full min-w-0 py-4 sm:py-6 pb-12 sm:pb-16 space-y-4 sm:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
      <DashboardWelcome />
      <DashboardContent />
    </div>
  )
}
