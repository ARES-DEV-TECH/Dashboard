import { Skeleton } from '@/components/ui/skeleton'
import { PageLayout } from '@/components/layout/PageLayout'

export default function SalesLoading() {
  return (
    <PageLayout title="Ventes">
      <div className="space-y-4">
        <div className="flex flex-wrap justify-between gap-4">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </PageLayout>
  )
}
