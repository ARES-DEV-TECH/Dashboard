import { ClientsContent } from './clients-content'

export default function ClientsPage() {
  return (
    <div className="w-full min-w-0 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Clients</h1>
      <ClientsContent />
    </div>
  )
}
