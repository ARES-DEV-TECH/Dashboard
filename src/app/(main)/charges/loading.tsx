import { Skeleton } from '@/components/ui/skeleton'

export default function ChargesLoading() {
  return (
    <div className="w-full min-w-0 py-4 sm:py-6 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-9 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
