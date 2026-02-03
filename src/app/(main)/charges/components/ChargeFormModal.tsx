'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Charge, Client } from '@/lib/validations'
import { Calendar, Tag, CreditCard, FileText, Link, StickyNote } from 'lucide-react'

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
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editingCharge ? 'Modifier la charge' : 'Nouvelle charge'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colonne Gauche : Détails principaux */}
            <div className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-lg border space-y-4 h-full">
                <h3 className="font-medium text-sm flex items-center gap-2 text-foreground/80">
                  <Tag className="size-4" /> Détails de la dépense
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expenseDate">Date</Label>
                    <Input
                      id="expenseDate"
                      type="date"
                      value={formData.expenseDate}
                      onChange={(e) => setFormData((prev) => ({ ...prev, expenseDate: e.target.value }))}
                      required
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Montant</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                      placeholder="0.00"
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendor">Fournisseur</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, vendor: e.target.value }))}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recurringType">Récurrence</Label>
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
                    <SelectTrigger aria-label="Type de récurrence" className="bg-background">
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ponctuel">Ponctuel</SelectItem>
                      <SelectItem value="mensuel">Mensuel</SelectItem>
                      <SelectItem value="annuel">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Colonne Droite : Contexte & Liaison */}
            <div className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-lg border space-y-4 h-full">
                <h3 className="font-medium text-sm flex items-center gap-2 text-foreground/80">
                  <Link className="size-4" /> Contexte & Liaisons
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkedService">Service lié</Label>
                    <Select
                      value={formData.linkedService}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, linkedService: value === 'none' ? '' : value }))
                      }
                    >
                      <SelectTrigger aria-label="Service lié" className="bg-background">
                        <SelectValue placeholder="Aucun" />
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
                  <div className="space-y-2">
                    <Label htmlFor="linkedClient">Client lié</Label>
                    <Select
                      value={formData.linkedClient}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, linkedClient: value === 'none' ? '' : value }))
                      }
                    >
                      <SelectTrigger aria-label="Client lié" className="bg-background">
                        <SelectValue placeholder="Aucun" />
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

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Moyen de paiement</Label>
                  <Input
                    id="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="bg-background min-h-[80px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2 pt-6 border-t">
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
