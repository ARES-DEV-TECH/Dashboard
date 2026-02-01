import { Skeleton } from '@/components/ui/skeleton'

export default function ChargesLoading() {
  return (
    <div className="w-full min-w-0 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border bg-card p-6 shadow-sm flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border p-4">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
