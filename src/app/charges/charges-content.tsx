"use client"

import { useState } from 'react'
import useSWR from 'swr'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Charge, Client } from '@/lib/validations'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'
import { safeErrorMessage } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ChargeFormModal } from './components/ChargeFormModal'
import { SWR_KEYS, fetchCharges, fetchArticles, fetchClients } from '@/lib/swr-fetchers'

export function ChargesContent() {
  const { data: chargesData, error: chargesError, isLoading: chargesLoading, mutate: mutateCharges } = useSWR(SWR_KEYS.charges, fetchCharges, { revalidateOnFocus: false, dedupingInterval: 5000 })
  const { data: articles = [], isLoading: articlesLoading } = useSWR(SWR_KEYS.articles, fetchArticles, { revalidateOnFocus: false, dedupingInterval: 5000 })
  const { data: clients = [], isLoading: clientsLoading } = useSWR(SWR_KEYS.clients, fetchClients, { revalidateOnFocus: false, dedupingInterval: 5000 })

  const charges = chargesData?.charges ?? []
  const loading = chargesLoading || articlesLoading || clientsLoading

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null)
  const [formData, setFormData] = useState({
    expenseDate: '',
    category: '',
    vendor: '',
    description: '',
    amount: 0,
    recurring: false,
    recurringType: '',
    paymentMethod: '',
    notes: '',
    linkedService: '',
    linkedClient: '',
    year: new Date().getFullYear(),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const chargeData = {
      ...formData,
      expenseDate: new Date(formData.expenseDate),
      amount: Number(formData.amount) || null,
      linkedService: formData.linkedService === '' || formData.linkedService === 'none' ? null : formData.linkedService,
      linkedClient: formData.linkedClient === '' || formData.linkedClient === 'none' ? null : formData.linkedClient,
      year: new Date(formData.expenseDate).getFullYear(),
    }

    const url = editingCharge ? `/api/charges/${editingCharge.id}` : '/api/charges'
    const method = editingCharge ? 'PUT' : 'POST'
    const previousCharges = [...charges]

    const optimisticCharge: Charge = {
      id: editingCharge?.id ?? `temp-${Date.now()}`,
      expenseDate: new Date(formData.expenseDate),
      amount: chargeData.amount ?? 0,
      category: formData.category,
      vendor: formData.vendor,
      description: formData.description,
      recurringType: (formData.recurringType || 'ponctuel') as 'mensuel' | 'annuel' | 'ponctuel',
      paymentMethod: formData.paymentMethod,
      notes: formData.notes,
      linkedService: chargeData.linkedService ?? undefined,
      linkedClient: chargeData.linkedClient ?? undefined,
      linkedSaleId: undefined,
      year: chargeData.year,
    }

    if (editingCharge) {
      const optimistic = charges.map(c =>
        c.id === editingCharge.id ? { ...c, ...optimisticCharge, id: editingCharge.id } : c
      )
      mutateCharges({ charges: optimistic, pagination: chargesData?.pagination }, { revalidate: false })
    } else {
      mutateCharges({ charges: [...charges, optimisticCharge], pagination: chargesData?.pagination }, { revalidate: false })
    }

    try {
      const response = await electronFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chargeData),
      })

      if (response.ok) {
        await mutateCharges()
        resetForm()
        setIsDialogOpen(false)
        setEditingCharge(null)
        toast.success('Charges', { description: editingCharge ? 'Charge mise à jour.' : 'Charge enregistrée.' })
      } else {
        mutateCharges({ charges: previousCharges, pagination: chargesData?.pagination }, { revalidate: false })
        const err = await response.json()
        toast.error('Charges', { description: err?.error ?? err?.message ?? 'Erreur lors de la sauvegarde' })
      }
    } catch (error) {
      console.error('Error saving charge:', error)
      mutateCharges({ charges: previousCharges, pagination: chargesData?.pagination }, { revalidate: false })
      toast.error('Charges', { description: safeErrorMessage(error, 'Erreur lors de la sauvegarde') })
    }
  }

  const handleEdit = (charge: Charge) => {
    setEditingCharge(charge)
    const recurringType = charge.recurringType || ''
    
    // Préserver la date originale sans conversion de fuseau horaire
    let expenseDate = ''
    if (typeof charge.expenseDate === 'string') {
      expenseDate = (charge.expenseDate as string).split('T')[0] // Garder seulement la partie date
    } else {
      // Créer une date locale pour éviter les problèmes de fuseau horaire
      const date = new Date(charge.expenseDate)
      expenseDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }
    
    setFormData({
      expenseDate: expenseDate,
      category: charge.category || '',
      vendor: charge.vendor || '',
      description: charge.description || '',
      amount: charge.amount || 0,
      recurring: (recurringType === 'mensuel' || recurringType === 'annuel'),
      recurringType: recurringType,
      paymentMethod: charge.paymentMethod || '',
      notes: charge.notes || '',
      linkedService: charge.linkedService || 'none',
      linkedClient: charge.linkedClient || 'none',
      year: charge.year,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (charge: Charge) => {
    if (!confirm(`Supprimer la charge ${charge.id} ?`)) return
    const previousCharges = [...charges]
    mutateCharges({ charges: charges.filter(c => c.id !== charge.id), pagination: chargesData?.pagination }, { revalidate: false })
    try {
      const response = await electronFetch(`/api/charges/${charge.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await mutateCharges()
        toast.success('Charges', { description: 'Charge supprimée.' })
      } else {
        mutateCharges({ charges: previousCharges, pagination: chargesData?.pagination }, { revalidate: false })
        const err = await response.json()
        toast.error('Charges', { description: err?.error ?? err?.message ?? 'Erreur lors de la suppression' })
      }
    } catch (error) {
      console.error('Error deleting charge:', error)
      mutateCharges({ charges: previousCharges, pagination: chargesData?.pagination }, { revalidate: false })
      toast.error('Charges', { description: safeErrorMessage(error, 'Erreur lors de la suppression') })
    }
  }

  const resetForm = () => {
    setFormData({
      expenseDate: new Date().toISOString().split('T')[0],
      category: '',
      vendor: '',
      description: '',
      amount: 0,
      recurring: false,
      recurringType: '',
      paymentMethod: '',
      notes: '',
      linkedService: '',
      linkedClient: '',
      year: new Date().getFullYear(),
    })
    setEditingCharge(null)
    setIsDialogOpen(false)
  }

  const handleAdd = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const handleExport = () => {
    const csvData = generateCSV(charges, [
      'expenseDate',
      'category',
      'vendor',
      'description',
      'amount',
      'recurringType',
      'paymentMethod',
      'linkedService',
      'linkedClient',
    ])
    downloadCSV(csvData, 'charges.csv')
  }

  const columns: Column<Charge>[] = [
    {
      key: 'expenseDate',
      label: 'Date',
      sortable: true,
      render: (value) => new Date(value as string).toLocaleDateString('fr-FR'),
    },
    {
      key: 'category',
      label: 'Catégorie',
      render: (value) => value ? String(value) : <span className="text-foreground/70">Non renseignée</span>,
    },
    {
      key: 'vendor',
      label: 'Fournisseur',
      render: (value) => value ? String(value) : <span className="text-foreground/70">Non renseigné</span>,
    },
    {
      key: 'description',
      label: 'Description',
      render: (value) => value ? String(value) : <span className="text-foreground/70">Non renseignée</span>,
    },
    {
      key: 'amount',
      label: 'Montant',
    },
    {
      key: 'recurringType',
      label: 'Type',
      render: (value) => value ? (
        <Badge variant={value === 'mensuel' ? 'default' : value === 'annuel' ? 'secondary' : 'outline'}>
          {String(value)}
        </Badge>
      ) : (
        <span className="text-foreground/70">Non renseigné</span>
      ),
    },
    {
      key: 'linkedService',
      label: 'Service lié',
      render: (value) => value ? String(value) : <span className="text-foreground/70">Aucun</span>,
    },
    {
      key: 'linkedClient',
      label: 'Client lié',
      render: (value) => value ? String(value) : <span className="text-foreground/70">Aucun</span>,
    },
  ]

  if (loading) {
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
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Charges</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExport} variant="outline">
            Exporter CSV
          </Button>
          <Button onClick={handleAdd}>
            Nouvelle Charge
          </Button>
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-foreground">
          💡 <strong>Astuce :</strong> Utilisez les boutons d&apos;actions (✏️ Modifier, 🗑️ Supprimer) dans la colonne de droite pour gérer vos charges.
        </p>
      </div>

      <DataTable
        data={charges}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onExport={handleExport}
        virtualized
      />

      <ChargeFormModal
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        editingCharge={editingCharge}
        articles={articles}
        clients={clients}
        dataLoaded={!loading}
        onReset={resetForm}
      />
    </div>
  )
}
