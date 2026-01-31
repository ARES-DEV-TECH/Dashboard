import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const ClientsContent = dynamic(() => import('./clients-content').then((m) => ({ default: m.ClientsContent })), {
  loading: () => (
    <div className="w-full min-w-0 py-4 sm:py-6 space-y-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Clients</h1>
      <div className="flex justify-between">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  ),
})

export default function ClientsPage() {
  return (
    <div className="w-full min-w-0 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Clients</h1>
      <ClientsContent />
    </div>
  )
}
