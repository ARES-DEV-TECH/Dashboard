import { ClientsContent } from './clients-content'

export default function ClientsPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-2xl font-bold sm:text-3xl">Clients</h1>
      <ClientsContent />
    </div>
  )
}
