"use client"

import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Columns3 } from 'lucide-react'
import { Charge, Client } from '@/lib/validations'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'
import { safeErrorMessage } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ChargeFormModal } from './components/ChargeFormModal'
import { SWR_KEYS, fetchCharges, fetchArticles, fetchClients } from '@/lib/swr-fetchers'

const CHARGES_COLUMNS_STORAGE_KEY = 'charges-table-columns'
const DEFAULT_CHARGES_COLUMN_VISIBILITY: Record<string, boolean> = {
  expenseDate: true,
  category: true,
  vendor: true,
  description: true,
  amount: true,
  recurringType: true,
  linkedService: true,
  linkedClient: true,
}

export function ChargesContent() {
  const { data: chargesData, error: chargesError, isLoading: chargesLoading, mutate: mutateCharges } = useSWR(SWR_KEYS.charges, fetchCharges, { revalidateOnFocus: false, dedupingInterval: 10000, keepPreviousData: true })
  const { data: articles = [], isLoading: articlesLoading } = useSWR(SWR_KEYS.articles, fetchArticles, { revalidateOnFocus: false, dedupingInterval: 10000, keepPreviousData: true })
  const { data: clients = [], isLoading: clientsLoading } = useSWR(SWR_KEYS.clients, fetchClients, { revalidateOnFocus: false, dedupingInterval: 10000, keepPreviousData: true })

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
      const responseData = await response.json().catch(() => null)

      if (response.ok) {
        if (responseData && typeof responseData === 'object' && 'id' in responseData) {
          if (editingCharge) {
            mutateCharges(
              { charges: charges.map((c) => (c.id === editingCharge.id ? (responseData as Charge) : c)), pagination: chargesData?.pagination },
              { revalidate: false }
            )
          } else {
            mutateCharges(
              { charges: [...charges.filter((c) => c.id !== optimisticCharge.id), responseData as Charge], pagination: chargesData?.pagination },
              { revalidate: false }
            )
          }
        } else {
          await mutateCharges()
        }
        resetForm()
        setIsDialogOpen(false)
        setEditingCharge(null)
        toast.success('Charges', { description: editingCharge ? 'Charge mise à jour.' : 'Charge enregistrée.' })
      } else {
        mutateCharges({ charges: previousCharges, pagination: chargesData?.pagination }, { revalidate: false })
        toast.error('Charges', { description: (responseData as { error?: string; message?: string })?.error ?? (responseData as { error?: string; message?: string })?.message ?? 'Erreur lors de la sauvegarde' })
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

  useEffect(() => {
    const handler = () => handleAdd()
    window.addEventListener('shortcut-new', handler)
    return () => window.removeEventListener('shortcut-new', handler)
  }, [])

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

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return { ...DEFAULT_CHARGES_COLUMN_VISIBILITY }
    try {
      const stored = window.localStorage.getItem(CHARGES_COLUMNS_STORAGE_KEY)
      if (!stored) return { ...DEFAULT_CHARGES_COLUMN_VISIBILITY }
      const parsed = JSON.parse(stored) as Record<string, boolean>
      return { ...DEFAULT_CHARGES_COLUMN_VISIBILITY, ...parsed }
    } catch {
      return { ...DEFAULT_CHARGES_COLUMN_VISIBILITY }
    }
  })

  const saveColumnVisibility = (next: Record<string, boolean>) => {
    setColumnVisibility(next)
    try {
      window.localStorage.setItem(CHARGES_COLUMNS_STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }

  const toggleColumn = (key: string) => {
    const visibleCount = Object.values(columnVisibility).filter(Boolean).length
    const currentlyVisible = columnVisibility[key] !== false
    if (currentlyVisible && visibleCount <= 1) return
    saveColumnVisibility({ ...columnVisibility, [key]: !currentlyVisible })
  }

  const columns: Column<Charge>[] = useMemo(
    () => [
      {
        key: 'expenseDate',
        label: 'Date',
        sortable: true,
        sortLabel: 'numeric',
        render: (value) => new Date(value as string).toLocaleDateString('fr-FR'),
      },
      {
        key: 'category',
        label: 'Catégorie',
        sortable: true,
        sortLabel: 'alpha',
        render: (value) => value ? String(value) : <span className="text-foreground/70">Non renseignée</span>,
      },
      {
        key: 'vendor',
        label: 'Fournisseur',
        sortable: true,
        sortLabel: 'alpha',
        render: (value) => value ? String(value) : <span className="text-foreground/70">Non renseigné</span>,
      },
      {
        key: 'description',
        label: 'Description',
        sortable: true,
        sortLabel: 'alpha',
        render: (value) => value ? String(value) : <span className="text-foreground/70">Non renseignée</span>,
      },
      { key: 'amount', label: 'Montant', sortable: true, sortLabel: 'numeric' },
      {
        key: 'recurringType',
        label: 'Type',
        sortable: true,
        sortLabel: 'alpha',
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
        sortable: true,
        sortLabel: 'alpha',
        render: (value) => value ? String(value) : <span className="text-foreground/70">Aucun</span>,
      },
      {
        key: 'linkedClient',
        label: 'Client lié',
        sortable: true,
        sortLabel: 'alpha',
        render: (value) => value ? String(value) : <span className="text-foreground/70">Aucun</span>,
      },
    ],
    []
  )

  const visibleColumns = useMemo(
    () => columns.filter((c) => columnVisibility[String(c.key)] !== false),
    [columns, columnVisibility]
  )

  const columnsPopover = (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Afficher ou masquer des colonnes">
          <Columns3 className="h-4 w-4 mr-2" />
          Colonnes
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="text-sm font-medium text-foreground px-2 py-1.5">Colonnes visibles</p>
        <p className="text-xs text-muted-foreground px-2 pb-2">Au moins une colonne doit rester affichée.</p>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {columns.map((col) => (
            <label
              key={String(col.key)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 cursor-pointer text-sm"
            >
              <Checkbox
                checked={columnVisibility[String(col.key)] !== false}
                onCheckedChange={() => toggleColumn(String(col.key))}
                aria-label={`Afficher ${col.label}`}
              />
              <span>{col.label}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )

  if (loading && charges.length === 0) {
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
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-foreground">
          💡 <strong>Astuce :</strong> Utilisez les boutons d&apos;actions (✏️ Modifier, 🗑️ Supprimer) dans la colonne de droite pour gérer vos charges.
        </p>
      </div>

      <DataTable
        data={charges}
        columns={visibleColumns}
        toolbarExtra={columnsPopover}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onExport={handleExport}
        searchPlaceholder="Rechercher une charge..."
        emptyMessage="Aucune charge. Créez votre première charge."
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
