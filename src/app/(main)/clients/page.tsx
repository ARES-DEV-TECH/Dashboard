import dynamic from 'next/dynamic'
import ClientsLoading from './loading'

const ClientsContent = dynamic(
  () => import('./clients-content').then((m) => ({ default: m.ClientsContent })),
  { loading: () => <ClientsLoading /> }
)

export default function ClientsPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-bold sm:text-3xl">Clients</h1>
      <ClientsContent />
    </div>
  )
}
