import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const SalesContent = dynamic(() => import('./sales-content').then((m) => ({ default: m.SalesContent })), {
  loading: () => (
    <div className="w-full min-w-0 py-4 sm:py-6 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  ),
})

export default function SalesPage() {
  return <SalesContent />
}
