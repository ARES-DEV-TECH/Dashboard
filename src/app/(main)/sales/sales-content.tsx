"use client"

import { useState, useEffect, useMemo } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, Column } from '@/components/ui/data-table'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { getDefaultTvaRate } from '@/lib/settings'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'
import { safeErrorMessage, formatTableDate, cn } from '@/lib/utils'
import { SWR_KEYS, fetchClients, fetchArticles, fetchSalesList, fetchCharges } from '@/lib/swr-fetchers'
import { SWR_LIST_OPTIONS } from '@/lib/swr-config'
import { Plus, Columns3, FileText, User, Package, Settings, Receipt, MoreHorizontal, Trash2, Edit } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

type SaleRow = {
  invoiceNo: string
  saleDate: string
  clientName: string
  clientCompany: string
  clientLastName: string
  clientFirstName: string
  serviceName: string
  totalTtc: number
  quantity: number
  unitPriceHt: number
  caHt: number
  tvaAmount?: number
  options?: string
  recurring?: boolean
  recurringType?: string | null
  endDate?: string | null
  year?: number
  status?: string
  [key: string]: unknown
}

const SALES_COLUMNS_STORAGE_KEY = 'sales-table-columns'

const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = {
  invoiceNo: true,
  clientCompany: true,
  clientLastName: true,
  clientFirstName: true,
  serviceName: true,
  saleDate: true,
  recurringType: true,
  status: true,
  totalTtc: true,
}

export function SalesContent() {
  const { mutate: globalMutate } = useSWRConfig()
  const { data: salesListData, isLoading: salesLoading, mutate: mutateSalesList } = useSWR(SWR_KEYS.salesList, fetchSalesList, SWR_LIST_OPTIONS)
  const { data: clients = [], isLoading: clientsLoading } = useSWR(SWR_KEYS.clients, fetchClients, SWR_LIST_OPTIONS)
  const { data: articles = [], isLoading: articlesLoading } = useSWR(SWR_KEYS.articles, fetchArticles, SWR_LIST_OPTIONS)
  const { data: chargesData, isLoading: chargesLoading, mutate: mutateCharges } = useSWR(SWR_KEYS.charges, fetchCharges, SWR_LIST_OPTIONS)

  const rawSales = salesListData?.sales ?? []
  const charges = chargesData?.charges ?? []

  const sales: SaleRow[] = useMemo(() => {
    return rawSales.map((sale) => {
      const client = clients.find((c) => c.clientName === sale.clientName)
      return {
        ...sale,
        clientCompany: client?.company?.trim() ?? '',
        clientLastName: client?.lastName?.trim() ?? '',
        clientFirstName: client?.firstName?.trim() ?? '',
      }
    })
  }, [rawSales, clients])

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return { ...DEFAULT_COLUMN_VISIBILITY }
    try {
      const stored = window.localStorage.getItem(SALES_COLUMNS_STORAGE_KEY)
      if (!stored) return { ...DEFAULT_COLUMN_VISIBILITY }
      const parsed = JSON.parse(stored) as Record<string, boolean>
      return { ...DEFAULT_COLUMN_VISIBILITY, ...parsed }
    } catch {
      return { ...DEFAULT_COLUMN_VISIBILITY }
    }
  })

  const saveColumnVisibility = (next: Record<string, boolean>) => {
    setColumnVisibility(next)
    try {
      window.localStorage.setItem(SALES_COLUMNS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // localStorage full or disabled
    }
  }

  const toggleColumn = (key: string) => {
    const visibleCount = Object.values(columnVisibility).filter(Boolean).length
    const currentlyVisible = columnVisibility[key] !== false
    if (currentlyVisible && visibleCount <= 1) return
    const next = { ...columnVisibility, [key]: !currentlyVisible }
    saveColumnVisibility(next)
  }

  const loading = salesLoading || clientsLoading || articlesLoading || chargesLoading

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSale, setEditingSale] = useState(null as any)
  const [formData, setFormData] = useState({
    saleDate: '', invoiceNo: '', clientName: '',
    items: [{
      serviceName: '', description: '', quantity: 1, unitPriceHt: 0,
      unitLabel: '', selectedOptions: [] as string[], serviceOptions: [] as any[]
    }],
    linkedCharges: [] as string[],
    recurringType: 'ponctuel' as 'ponctuel' | 'mensuel' | 'annuel',
    endDate: '', status: 'paid'
  })
  const [hoursInput, setHoursInput] = useState<string[]>([''])

  const handleChargeToggle = (chargeId: string) => {
    const id = String(chargeId)
    setFormData(prev => ({
      ...prev,
      linkedCharges: prev.linkedCharges.includes(id)
        ? prev.linkedCharges.filter(i => i !== id)
        : [...prev.linkedCharges, id]
    }))
  }

  const addLineItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        serviceName: '', description: '', quantity: 1, unitPriceHt: 0,
        unitLabel: '', selectedOptions: [] as string[], serviceOptions: [] as any[]
      }]
    }))
    setHoursInput(prev => [...prev, ''])
  }

  const removeLineItem = (index: number) => {
    if (formData.items.length <= 1) return
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
    setHoursInput(prev => prev.filter((_, i) => i !== index))
  }

  const updateLineItem = (index: number, updates: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, ...updates } : item)
    }))
  }

  const handleLineServiceChange = async (index: number, serviceName: string) => {
    const article = articles.find((a: any) => a.serviceName === serviceName)
    if (article) {
      try {
        const res = await electronFetch(`/api/service-options?serviceName=${encodeURIComponent(serviceName)}`)
        const options = res.ok ? (await res.json()).options || [] : []

        updateLineItem(index, {
          serviceName,
          unitPriceHt: article.priceHt,
          unitLabel: article.billByHour ? 'heure' : 'forfait',
          serviceOptions: options,
          selectedOptions: options.filter((o: any) => o.isDefault).map((o: any) => o.id)
        })

        const newHours = [...hoursInput]
        newHours[index] = article.billByHour ? '1' : ''
        setHoursInput(newHours)
      } catch (error) {
        console.error('Error loading service options:', error)
      }
    }
  }

  const handleLineOptionToggle = (itemIndex: number, optionId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i !== itemIndex) return item
        const newSelected = item.selectedOptions.includes(optionId)
          ? item.selectedOptions.filter(id => id !== optionId)
          : [...item.selectedOptions, optionId]
        return { ...item, selectedOptions: newSelected }
      })
    }))
  }

  const handleAdd = async () => {
    setEditingSale(null)
    const today = new Date().toISOString().split('T')[0]
    let nextNo = `F${new Date().getFullYear()}-000001`
    try {
      const res = await electronFetch('/api/sales/next-invoice-no')
      if (res.ok) {
        const data = await res.json()
        if (data.nextInvoiceNo) nextNo = data.nextInvoiceNo
      }
    } catch {
      // garder le fallback
    }
    setFormData({
      saleDate: today,
      invoiceNo: nextNo,
      clientName: '',
      items: [{
        serviceName: '', description: '', quantity: 1, unitPriceHt: 0,
        unitLabel: '', selectedOptions: [] as string[], serviceOptions: [] as any[]
      }],
      linkedCharges: [],
      recurringType: 'ponctuel',
      endDate: '',
      status: 'paid'
    })
    setHoursInput([''])
    setIsDialogOpen(true)
  }

  useEffect(() => {
    const handler = () => handleAdd()
    window.addEventListener('shortcut-new', handler)
    return () => window.removeEventListener('shortcut-new', handler)
  }, [])

  // Fonction utilitaire pour formater les dates
  const formatDateForInput = (date: any) => {
    if (!date) return '';

    try {
      // Si c'est déjà une string au format YYYY-MM-DD, la retourner
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }

      // Sinon, convertir en Date et formater
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return ''

      return dateObj.toISOString().split('T')[0];
    } catch {
      return ''
    }
  };

  const handleEdit = async (sale: any) => {
    setEditingSale(sale)

    const linkedCharges = charges
      .filter(charge => charge.linkedSaleId === sale.invoiceNo)
      .map(charge => String(charge.id))

    let items = []
    if (sale.items) {
      try {
        items = JSON.parse(sale.items).map((item: any) => ({
          ...item,
          serviceOptions: [], // will be loaded if needed
          selectedOptions: item.selectedOptions || []
        }))
      } catch (e) {
        console.error('Error parsing items:', e)
      }
    }

    if (items.length === 0) {
      const unitLabel = sale.unitLabel || (articles.find((a: any) => a.serviceName === sale.serviceName)?.billByHour ? 'heure' : 'forfait')
      items = [{
        serviceName: sale.serviceName,
        description: '',
        quantity: sale.quantity,
        unitPriceHt: sale.unitPriceHt,
        unitLabel,
        selectedOptions: [],
        serviceOptions: []
      }]
      if (sale.options) {
        try {
          const legacyOptions = JSON.parse(sale.options)
          items[0].selectedOptions = legacyOptions.filter((o: any) => o.selected).map((o: any) => o.id)
        } catch { }
      }
    }

    // Load options for each item
    const itemsWithOpts = await Promise.all(items.map(async (item) => {
      try {
        const res = await electronFetch(`/api/service-options?serviceName=${encodeURIComponent(item.serviceName)}`)
        const options = res.ok ? (await res.json()).options || [] : []
        return { ...item, serviceOptions: options }
      } catch {
        return item
      }
    }))

    setFormData({
      saleDate: formatDateForInput(sale.saleDate),
      invoiceNo: sale.invoiceNo,
      clientName: sale.clientName,
      items: itemsWithOpts,
      linkedCharges: linkedCharges,
      recurringType: sale.recurringType || (sale.recurring ? 'mensuel' : 'ponctuel'),
      endDate: formatDateForInput(sale.endDate),
      status: sale.status || 'paid'
    })
    setHoursInput(itemsWithOpts.map(i => i.unitLabel === 'heure' ? String(i.quantity) : ''))
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()

    // Validation des quantités
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i]
      if (item.unitLabel === 'heure') {
        const hours = parseFloat(hoursInput[i])
        if (hoursInput[i].trim() === '' || isNaN(hours) || hours < 0.5) {
          toast.error('Ventes', { description: `Veuillez saisir le nombre d'heures pour l'élément ${i + 1} (minimum 0,5).` })
          return
        }
      }
    }

    const itemsToSave = formData.items.map((item, i) => {
      const quantity = item.unitLabel === 'heure' ? (parseFloat(hoursInput[i]) || item.quantity) : item.quantity

      const selectedOptionsData = item.serviceOptions
        .filter(opt => item.selectedOptions.includes(opt.id))
        .map(opt => ({
          id: opt.id,
          name: opt.name,
          priceHt: opt.priceHt,
          selected: true
        }))

      const optionsTotalHt = selectedOptionsData.reduce((sum: number, opt: any) => sum + opt.priceHt, 0)

      return {
        ...item,
        quantity,
        options: selectedOptionsData,
        optionsTotalHt
      }
    })

    const totalHt = itemsToSave.reduce((sum, item) => sum + (item.quantity * (item.unitPriceHt + item.optionsTotalHt)), 0)
    const isRecurring = formData.recurringType !== 'ponctuel'

    const saleData = {
      ...formData,
      items: itemsToSave,
      caHt: totalHt,
      year: new Date(formData.saleDate).getFullYear(),
      recurring: isRecurring,
      recurringType: formData.recurringType,
      endDate: isRecurring && formData.endDate ? new Date(formData.endDate).toISOString() : null,
      status: formData.status
    }

    const url = editingSale ? `/api/sales/${editingSale.invoiceNo}` : '/api/sales'
    const method = editingSale ? 'PUT' : 'POST'
    const previousSales = [...sales]
    const client = clients.find((c) => c.clientName === formData.clientName)

    const optimisticSale: SaleRow = {
      invoiceNo: formData.invoiceNo,
      saleDate: formData.saleDate,
      clientName: formData.clientName,
      clientCompany: client?.company?.trim() ?? '',
      clientLastName: client?.lastName?.trim() ?? '',
      clientFirstName: client?.firstName?.trim() ?? '',
      serviceName: itemsToSave.length > 1 ? `${itemsToSave[0].serviceName} (+${itemsToSave.length - 1})` : itemsToSave[0].serviceName,
      quantity: itemsToSave.reduce((s, i) => s + i.quantity, 0),
      unitPriceHt: totalHt / Math.max(1, itemsToSave.reduce((s, i) => s + i.quantity, 0)),
      caHt: totalHt,
      totalTtc: totalHt * 1.2,
      tvaAmount: totalHt * 0.2,
      recurring: isRecurring,
      recurringType: formData.recurringType,
      endDate: isRecurring && formData.endDate ? formData.endDate : null,
      status: formData.status
    }
    if (editingSale) {
      const optimistic = sales.map(s =>
        s.invoiceNo === editingSale.invoiceNo ? { ...s, ...optimisticSale } : s
      )
      mutateSalesList({ sales: optimistic, pagination: salesListData?.pagination }, { revalidate: false })
    } else {
      mutateSalesList({ sales: [...sales, optimisticSale], pagination: salesListData?.pagination }, { revalidate: false })
    }

    try {
      const response = await electronFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      })

      if (response.ok) {
        const result = await response.json()
        const saleFromApi = result?.sale ?? result
        const saleId = saleFromApi?.invoiceNo || editingSale?.invoiceNo

        try {
          if (saleId) {
            const previouslyLinkedIds = charges
              .filter(c => c.linkedSaleId === saleId)
              .map(c => String(c.id))
            const toUnlink = previouslyLinkedIds.filter(id => !formData.linkedCharges.includes(id))
            await Promise.all(
              toUnlink.map(chargeId =>
                electronFetch(`/api/charges/${chargeId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ linkedSaleId: null })
                })
              )
            )
            await Promise.all(
              formData.linkedCharges.map(chargeId =>
                electronFetch(`/api/charges/${chargeId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ linkedSaleId: saleId })
                })
              )
            )
          }
        } catch (error) {
          console.error('Erreur lors de la liaison des charges:', error)
        }

        if (saleFromApi && typeof saleFromApi === 'object' && 'invoiceNo' in saleFromApi) {
          const clientForSale = clients.find((c) => c.clientName === saleFromApi.clientName)
          const row: SaleRow = {
            ...optimisticSale,
            ...saleFromApi,
            clientCompany: clientForSale?.company?.trim() ?? '',
            clientLastName: clientForSale?.lastName?.trim() ?? '',
            clientFirstName: clientForSale?.firstName?.trim() ?? '',
          }
          const next = editingSale
            ? sales.map((s) => (s.invoiceNo === editingSale.invoiceNo ? row : s))
            : [...sales.filter((s) => s.invoiceNo !== saleFromApi.invoiceNo), row]
          mutateSalesList({ sales: next, pagination: salesListData?.pagination }, { revalidate: false })
        } else {
          await mutateSalesList()
        }
        await Promise.all([
          mutateCharges(),
          globalMutate(SWR_KEYS.sales),
          globalMutate((k) => typeof k === 'string' && k.startsWith('dashboard'), undefined, { revalidate: true })
        ])
        setIsDialogOpen(false)
        setEditingSale(null)
        toast.success('Ventes', { description: editingSale ? 'Vente mise à jour.' : 'Vente enregistrée.' })
      } else {
        mutateSalesList({ sales: previousSales, pagination: salesListData?.pagination }, { revalidate: false })
        const error = await response.json()
        toast.error('Ventes', { description: (error?.error ?? error?.message) || 'Erreur lors de la sauvegarde' })
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      mutateSalesList({ sales: previousSales, pagination: salesListData?.pagination }, { revalidate: false })
      toast.error('Ventes', { description: 'Erreur lors de la sauvegarde' })
    }
  }

  const handleDelete = async (sale: { invoiceNo?: string }) => {
    const invoiceNo = sale?.invoiceNo
    if (!invoiceNo) {
      console.error('handleDelete: invoiceNo manquant', sale)
      toast.error('Ventes', { description: 'Impossible de supprimer : numéro de facture manquant.' })
      return
    }
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vente ?')) return
    const previousSales = [...sales]
    mutateSalesList({ sales: sales.filter(s => s.invoiceNo !== invoiceNo), pagination: salesListData?.pagination }, { revalidate: false })
    try {
      const url = `/api/sales/${encodeURIComponent(invoiceNo)}`
      const response = await electronFetch(url, { method: 'DELETE' })
      if (response.ok) {
        await Promise.all([
          mutateSalesList(),
          globalMutate(SWR_KEYS.sales),
          globalMutate((k) => typeof k === 'string' && k.startsWith('dashboard'), undefined, { revalidate: true })
        ])
        toast.success('Ventes', { description: 'Vente supprimée.' })
      } else {
        mutateSalesList({ sales: previousSales, pagination: salesListData?.pagination }, { revalidate: false })
        const err = await response.json().catch(() => ({}))
        toast.error('Ventes', { description: err?.error || `Erreur lors de la suppression (${response.status})` })
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      mutateSalesList({ sales: previousSales, pagination: salesListData?.pagination }, { revalidate: false })
      toast.error('Ventes', { description: 'Erreur lors de la suppression' })
    }
  }

  const enrichSaleForPdf = async (sale: any) => {
    const rate = await getDefaultTvaRate()
    const client = clients.find((c) => c.clientName === sale.clientName)
    return {
      ...sale,
      tvaRate: rate,
      tvaAmount: sale.caHt * (rate / 100),
      totalTtc: sale.caHt * (1 + rate / 100),
      ...(client && { client: { email: client.email, website: client.website, company: client.company } }),
    }
  }

  const handleGenerateQuote = async (sale: any) => {
    const id = toast.loading('Ventes', { description: 'Génération du devis en cours...' })
    try {
      const { generateQuotePDFViaWorker } = await import('@/lib/pdf-worker-client')
      await generateQuotePDFViaWorker(await enrichSaleForPdf(sale))
      toast.success('Ventes', { description: 'Devis généré avec succès !', id })
    } catch (e) {
      console.error('Devis:', e)
      toast.error('Ventes', { description: safeErrorMessage(e, 'Erreur lors de la génération du devis'), id })
    }
  }

  const handleGenerateInvoice = async (sale: any) => {
    const id = toast.loading('Ventes', { description: 'Génération de la facture en cours...' })
    try {
      const { generateInvoicePDFViaWorker } = await import('@/lib/pdf-worker-client')
      await generateInvoicePDFViaWorker([await enrichSaleForPdf(sale)])
      toast.success('Ventes', { description: 'Facture générée avec succès !', id })
    } catch (e) {
      console.error('Facture:', e)
      toast.error('Ventes', { description: safeErrorMessage(e, 'Erreur lors de la génération de la facture'), id })
    }
  }

  const handleExportCSV = () => {
    const csvData = sales.map(sale => ({
      'N° Facture': sale.invoiceNo,
      'Date': sale.saleDate,
      'Client': sale.clientName,
      'Service': sale.serviceName,
      'Quantité': sale.quantity,
      'Prix unitaire HT': sale.unitPriceHt,
      'CA HT': sale.caHt,
      'Montant TVA': sale.tvaAmount,
      'Total TTC': sale.totalTtc
    }))
    downloadCSV(csvData as any, 'ventes.csv')
  }

  const salesColumns: Column<SaleRow>[] = useMemo(
    () => [
      { key: 'invoiceNo', label: 'N° facture', sortable: true, sortLabel: 'alpha' },
      { key: 'clientCompany', label: 'Entreprise', sortable: true, sortLabel: 'alpha' },
      { key: 'clientLastName', label: 'Nom', sortable: true, sortLabel: 'alpha' },
      { key: 'clientFirstName', label: 'Prénom', sortable: true, sortLabel: 'alpha' },
      { key: 'serviceName', label: 'Service', sortable: true, sortLabel: 'alpha', render: (v: unknown) => (v ? String(v) : '—') },
      {
        key: 'saleDate',
        label: 'Date',
        sortable: true,
        sortLabel: 'numeric',
        render: (val: unknown) => (val ? formatTableDate(String(val)) : ''),
      },
      {
        key: 'recurringType',
        label: 'Fréquence',
        sortable: true,
        sortLabel: 'alpha',
        render: (val: unknown) => {
          const v = String(val ?? '').toLowerCase()
          if (v === 'mensuel') return 'Mensuel'
          if (v === 'annuel') return 'Annuel'
          return 'Ponctuel'
        },
      },
      {
        key: 'status',
        label: 'Statut',
        sortable: true,
        sortLabel: 'alpha',
        render: (val: unknown) => {
          const s = String(val ?? 'paid').toLowerCase()
          if (s === 'paid') return 'Payée'
          if (s === 'pending') return 'En attente'
          if (s === 'cancelled') return 'Annulée'
          return s
        },
      },
      {
        key: 'totalTtc',
        label: 'Prix',
        sortable: true,
        sortLabel: 'numeric',
        render: (val: unknown) => (typeof val === 'number' ? `${Number(val).toFixed(2)} €` : ''),
      },
    ],
    []
  )

  const visibleColumns = useMemo(
    () => salesColumns.filter((c) => columnVisibility[String(c.key)] !== false),
    [salesColumns, columnVisibility]
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
          {salesColumns.map((col) => (
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

  const renderMobileItem = (sale: SaleRow) => {
    const statusLabel = sale.status === 'paid' ? 'Payée' : sale.status === 'pending' ? 'En attente' : 'Annulée';
    const statusVariant = sale.status === 'paid' ? 'default' : sale.status === 'pending' ? 'secondary' : 'destructive';

    const sidebarColor = sale.status === 'paid' ? 'bg-green-500' : sale.status === 'pending' ? 'bg-orange-500' : 'bg-red-500';

    return (
      <Card className="group relative overflow-hidden transition-all hover:ring-1 hover:ring-primary/20 border-primary/5 bg-gradient-to-b from-background/80 to-muted/20">
        <div className={cn("absolute top-0 left-0 w-1 h-full", sidebarColor)} />
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase tracking-tighter text-muted-foreground">
                  #{sale.invoiceNo}
                </span>
                <span className="text-[10px] text-muted-foreground">•</span>
                <span className="text-[10px] text-muted-foreground">{formatTableDate(sale.saleDate)}</span>
              </div>
              <div className="font-bold text-base truncate">{sale.clientName}</div>
              <div className="text-xs text-muted-foreground truncate">{sale.serviceName}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="font-bold text-lg italic text-primary leading-none">
                {sale.totalTtc.toFixed(2)} €
              </div>
              <Badge
                variant={statusVariant}
                className={cn(
                  "text-[10px] font-semibold px-2 py-0 h-5",
                  sale.status === 'paid' && "bg-green-500/10 text-green-500 border-green-500/20"
                )}
              >
                {statusLabel}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-muted/50">
            <Badge variant="outline" className="text-[10px] font-normal opacity-70">
              {sale.recurringType === 'mensuel' ? 'Mensuel' : sale.recurringType === 'annuel' ? 'Annuel' : 'Ponctuel'}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-medium hover:bg-primary/10">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  Gérer
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleGenerateQuote(sale)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Devis PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleGenerateInvoice(sale)}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Facture PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleEdit(sale)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(sale)} className="text-destructive font-semibold">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading && sales.length === 0) {
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
    <div className="space-y-4 sm:space-y-6">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-sm text-foreground">
            💡 <strong>Astuce :</strong> Les options des services s&apos;affichent automatiquement lors de la création d&apos;une vente. Configurez d&apos;abord vos services dans la section Articles.
          </p>
        </CardContent>
      </Card>

      <DataTable<SaleRow>
        data={sales}
        columns={visibleColumns}
        searchable
        searchPlaceholder="Rechercher (facture, client, service…)"
        pagination
        pageSize={15}
        defaultSort={{ field: 'saleDate', direction: 'desc' }}
        toolbarExtra={columnsPopover}
        onExport={handleExportCSV}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onGenerateQuote={handleGenerateQuote}
        onGenerateInvoice={handleGenerateInvoice}
        emptyMessage="Aucune vente. Cliquez sur Nouveau pour en créer une."
        renderMobileItem={renderMobileItem}
      />

      {/* Dialog pour créer/modifier une vente */}
      <ResponsiveDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingSale ? 'Modifier la vente' : 'Nouvelle vente'}
        className="sm:max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colonne Gauche : Informations Générales */}
            <div className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
                <h3 className="font-medium text-sm flex items-center gap-2 text-foreground/80">
                  <FileText className="size-4" /> Informations Facture
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="saleDate">Date</Label>
                    <Input
                      id="saleDate"
                      type="date"
                      value={formData.saleDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, saleDate: e.target.value }))}
                      required
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNo">N° Facture</Label>
                    <Input
                      id="invoiceNo"
                      value={formData.invoiceNo}
                      onChange={(e) => setFormData(prev => ({ ...prev, invoiceNo: e.target.value }))}
                      placeholder="F2026-000001"
                      maxLength={50}
                      pattern="[A-Za-z0-9\-]+"
                      title="Lettres, chiffres et tirets uniquement"
                      required
                      className="bg-background"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Sélectionner le statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Payée</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                      <SelectItem value="cancelled">Annulée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
                <h3 className="font-medium text-sm flex items-center gap-2 text-foreground/80">
                  <User className="size-4" /> Client
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client</Label>
                  <Select value={formData.clientName} onValueChange={(value) => setFormData(prev => ({ ...prev, clientName: value }))}>
                    <SelectTrigger aria-label="Sélectionner un client" className="bg-background">
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.length === 0 ? (
                        <SelectItem value="no-clients" disabled>
                          Aucun client disponible
                        </SelectItem>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client.clientName ?? ''} value={client.clientName ?? ''}>
                            {[client.firstName, client.lastName].filter(Boolean).join(' ') || client.clientName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Liste des Services (Items) */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base flex items-center gap-2 text-primary">
                  <Package className="size-5" /> Articles & Services
                </h3>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="h-8 border-dashed border-primary/50 text-primary hover:bg-primary/5">
                  <Plus className="size-4 mr-2" /> Ajouter un article
                </Button>
              </div>

              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="relative bg-muted/20 p-5 rounded-xl border border-primary/10 space-y-4 shadow-sm group">
                    {formData.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor={`service-${index}`}>Service / Article</Label>
                        <Select
                          value={item.serviceName}
                          onValueChange={(val) => handleLineServiceChange(index, val)}
                        >
                          <SelectTrigger id={`service-${index}`} aria-label="Sélectionner un service" className="bg-background">
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            {articles.map((article) => (
                              <SelectItem key={article.serviceName} value={article.serviceName}>
                                {article.serviceName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`price-${index}`}>{item.unitLabel === 'heure' ? 'Prix/h HT' : 'Prix unit. HT'}</Label>
                        <div className="relative">
                          <Input
                            id={`price-${index}`}
                            type="number"
                            step="0.01"
                            value={item.unitPriceHt}
                            onChange={(e) => updateLineItem(index, { unitPriceHt: parseFloat(e.target.value) || 0 })}
                            className="bg-background pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">€</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`qty-${index}`}>{item.unitLabel === 'heure' ? 'Heures' : 'Qté'}</Label>
                        {item.unitLabel === 'heure' ? (
                          <Input
                            id={`qty-${index}`}
                            type="text"
                            inputMode="decimal"
                            value={hoursInput[index]}
                            onChange={(e) => {
                              const val = e.target.value.replace(',', '.')
                              const next = [...hoursInput]
                              next[index] = val
                              setHoursInput(next)
                              const n = parseFloat(val)
                              if (!isNaN(n) && n >= 0) updateLineItem(index, { quantity: n })
                            }}
                            className="bg-background"
                          />
                        ) : (
                          <Input
                            id={`qty-${index}`}
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, { quantity: parseInt(e.target.value) || 1 })}
                            className="bg-background"
                          />
                        )}
                      </div>
                    </div>

                    {/* Options pour cet item */}
                    {item.serviceOptions.length > 0 && (
                      <div className="pt-2 border-t border-primary/5 space-y-3">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Options Disponibles</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.serviceOptions.map((opt) => (
                            <div key={opt.id} className="flex items-center space-x-2 bg-background/50 p-2 rounded-lg border border-transparent hover:border-primary/20 transition-colors">
                              <Checkbox
                                id={`opt-${index}-${opt.id}`}
                                checked={item.selectedOptions.includes(opt.id)}
                                onCheckedChange={() => handleLineOptionToggle(index, opt.id)}
                              />
                              <Label htmlFor={`opt-${index}-${opt.id}`} className="flex-1 text-xs cursor-pointer truncate">
                                {opt.name} <span className="text-[10px] text-muted-foreground ml-1">(+{opt.priceHt}€)</span>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Résumé des totaux */}
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex flex-col items-end gap-1">
                <div className="text-xs text-muted-foreground">Total HT Estimé</div>
                <div className="text-2xl font-bold text-primary italic">
                  {formData.items.reduce((s, item, i) => {
                    const q = item.unitLabel === 'heure' ? (parseFloat(hoursInput[i]) || 0) : item.quantity
                    const optTotal = item.serviceOptions
                      .filter(o => item.selectedOptions.includes(o.id))
                      .reduce((sum, o) => sum + o.priceHt, 0)
                    return s + (q * (item.unitPriceHt + optTotal))
                  }, 0).toFixed(2)} €
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
            <div className="space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2 text-foreground/80">
                <Receipt className="size-4" /> Récurrence & Fin
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recurringType">Plan</Label>
                  <Select
                    value={formData.recurringType}
                    onValueChange={(value: 'ponctuel' | 'mensuel' | 'annuel') => setFormData(prev => ({ ...prev, recurringType: value }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ponctuel">Une fois</SelectItem>
                      <SelectItem value="mensuel">Mensuel</SelectItem>
                      <SelectItem value="annuel">Annuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.recurringType !== 'ponctuel' && (
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Date de fin</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="bg-background"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Section pour lier des charges */}
            {charges.length > 0 && (
              <div className="space-y-4">
                <Label className="text-base font-medium">Charges liées (optionnel)</Label>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-4">
                    Sélectionnez les charges à lier à cette vente
                  </p>
                  <div className="space-y-3">
                    {charges.map((charge) => (
                      <div key={charge.id} className="flex items-start space-x-3">
                        <Checkbox
                          id={`charge-${charge.id}`}
                          checked={formData.linkedCharges.includes(String(charge.id))}
                          onCheckedChange={() => handleChargeToggle(String(charge.id))}
                          className="mt-1"
                        />
                        <Label
                          htmlFor={`charge-${charge.id}`}
                          className="flex-1 cursor-pointer text-sm font-normal"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <span className="font-medium text-foreground">
                              {charge.description || charge.vendor || 'Charge sans description'}
                            </span>
                            <span className="text-muted-foreground whitespace-nowrap">
                              {charge.amount ? `${charge.amount.toFixed(2)}€` : 'N/A'}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {charge.category && `${charge.category} • `}
                            {formatTableDate(charge.expenseDate)}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Résumé des charges sélectionnées */}
                {formData.linkedCharges.length > 0 && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <p className="text-sm font-medium text-foreground mb-3">Charges liées :</p>
                    <div className="space-y-2">
                      {charges
                        .filter(charge => formData.linkedCharges.includes(String(charge.id)))
                        .map((charge) => (
                          <div key={charge.id} className="flex justify-between text-sm">
                            <span>{charge.description || charge.vendor || 'Charge sans description'}</span>
                            <span className="font-medium">
                              {charge.amount ? `${charge.amount.toFixed(2)}€` : 'N/A'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {editingSale ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>
    </div>
  )
}