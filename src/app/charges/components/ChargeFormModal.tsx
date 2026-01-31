'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Charge, Client } from '@/lib/validations'

export interface ChargeFormData {
  expenseDate: string
  category: string
  vendor: string
  description: string
  amount: number
  recurring: boolean
  recurringType: string
  paymentMethod: string
  notes: string
  linkedService: string
  linkedClient: string
  year: number
}

export function ChargeFormModal({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  editingCharge,
  articles,
  clients,
  dataLoaded,
  onReset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: ChargeFormData
  setFormData: React.Dispatch<React.SetStateAction<ChargeFormData>>
  onSubmit: (e: React.FormEvent) => void
  editingCharge: Charge | null
  articles: Array<{ serviceName: string }>
  clients: Client[]
  dataLoaded: boolean
  onReset: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingCharge ? 'Modifier la charge' : 'Nouvelle charge'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expenseDate">Date</Label>
              <Input
                id="expenseDate"
                type="date"
                value={formData.expenseDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, expenseDate: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Catégorie</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vendor">Fournisseur</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) => setFormData((prev) => ({ ...prev, vendor: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="linkedService">Service lié</Label>
              <Select
                value={formData.linkedService}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, linkedService: value === 'none' ? '' : value }))
                }
              >
                <SelectTrigger aria-label="Service lié">
                  <SelectValue placeholder="Aucun service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun service</SelectItem>
                  {dataLoaded && articles.length > 0
                    ? articles.map((article) => (
                        <SelectItem key={article.serviceName} value={article.serviceName}>
                          {article.serviceName}
                        </SelectItem>
                      ))
                    : (
                        <SelectItem value="loading" disabled>
                          Chargement...
                        </SelectItem>
                      )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="linkedClient">Client lié</Label>
              <Select
                value={formData.linkedClient}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, linkedClient: value === 'none' ? '' : value }))
                }
              >
                <SelectTrigger aria-label="Client lié">
                  <SelectValue placeholder="Aucun client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun client</SelectItem>
                  {dataLoaded && clients.length > 0
                    ? clients.map((client) => {
                        const id = client.clientName ?? ([client.firstName, client.lastName].filter(Boolean).join(' ') || '')
                        return (
                          <SelectItem key={id} value={id}>
                            {[client.firstName, client.lastName].filter(Boolean).join(' ') || id}
                          </SelectItem>
                        )
                      })
                    : (
                        <SelectItem value="loading" disabled>
                          Chargement...
                        </SelectItem>
                      )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Montant</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="recurringType">Type de récurrence</Label>
              <Select
                value={formData.recurringType || ''}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    recurringType: value,
                    recurring: value === 'mensuel' || value === 'annuel',
                  }))
                }
              >
                <SelectTrigger aria-label="Type de récurrence">
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensuel">Mensuel</SelectItem>
                  <SelectItem value="annuel">Annuel</SelectItem>
                  <SelectItem value="ponctuel">Ponctuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentMethod">Moyen de paiement</Label>
              <Input
                id="paymentMethod"
                value={formData.paymentMethod}
                onChange={(e) => setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onReset}>
              Annuler
            </Button>
            <Button type="submit">{editingCharge ? 'Modifier' : 'Créer'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
