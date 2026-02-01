"use client"

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { getDefaultTvaRate } from '@/lib/settings'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'
import { safeErrorMessage } from '@/lib/utils'
import { SWR_KEYS, fetchClients, fetchArticles, fetchSales, fetchCharges } from '@/lib/swr-fetchers'
import { Plus } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'

export function SalesContent() {
  const { data: salesData, error: salesError, isLoading: salesLoading, mutate: mutateSales } = useSWR(SWR_KEYS.sales, fetchSales, { revalidateOnFocus: false, dedupingInterval: 5000 })
  const { data: clients = [], isLoading: clientsLoading } = useSWR(SWR_KEYS.clients, fetchClients, { revalidateOnFocus: false, dedupingInterval: 5000 })
  const { data: articles = [], isLoading: articlesLoading } = useSWR(SWR_KEYS.articles, fetchArticles, { revalidateOnFocus: false, dedupingInterval: 5000 })
  const { data: chargesData, isLoading: chargesLoading, mutate: mutateCharges } = useSWR(SWR_KEYS.charges, fetchCharges, { revalidateOnFocus: false, dedupingInterval: 5000 })

  const sales = salesData?.sales ?? []
  const charges = chargesData?.charges ?? []
  const loading = salesLoading || clientsLoading || articlesLoading || chargesLoading

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSale, setEditingSale] = useState(null as any)
  const [formData, setFormData] = useState({
    saleDate: '', invoiceNo: '', clientName: '', serviceName: '', quantity: 1, unitPriceHt: 0,
    unitLabel: '' as string, selectedOptions: [] as string[], linkedCharges: [] as string[],
  })
  const [selectedServiceOptions, setSelectedServiceOptions] = useState([] as any[])
  const [selectedOptions, setSelectedOptions] = useState([] as any[])
  const [hoursInput, setHoursInput] = useState('')

  const handleChargeToggle = (chargeId: string) => {
    const id = String(chargeId)
    setFormData(prev => ({
      ...prev,
      linkedCharges: prev.linkedCharges.includes(id)
        ? prev.linkedCharges.filter(i => i !== id)
        : [...prev.linkedCharges, id]
    }))
  }

  const loadServiceOptions = async (serviceName: string) => {
    try {
      const res = await electronFetch(`/api/service-options?serviceName=${encodeURIComponent(serviceName)}`)
      if (res.ok) setSelectedServiceOptions((await res.json()).options || [])
      else setSelectedServiceOptions([])
    } catch {
      setSelectedServiceOptions([])
    }
  }

  const handleServiceChange = (serviceName: string) => {
    const article = articles.find((a: any) => a.serviceName === serviceName)
    if (article) {
      const billByHour = !!article.billByHour
      setFormData(prev => ({
        ...prev,
        serviceName,
        unitPriceHt: article.priceHt,
        quantity: 1,
        unitLabel: billByHour ? 'heure' : 'forfait',
      }))
      setHoursInput(billByHour ? '1' : '')
      loadServiceOptions(serviceName)
    }
  }

  const handleOptionToggle = (optionId: string) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    )
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
      serviceName: '',
      quantity: 1,
      unitPriceHt: 0,
      unitLabel: '',
      selectedOptions: [],
      linkedCharges: []
    })
    setHoursInput('')
    setSelectedServiceOptions([])
    setSelectedOptions([])
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

  const handleEdit = (sale: any) => {
    setEditingSale(sale)

    // Trouver les charges liées à cette vente (ids en string pour cohérence)
    const linkedCharges = charges
      .filter(charge => charge.linkedSaleId === sale.invoiceNo)
      .map(charge => String(charge.id))
    
    const unitLabel = sale.unitLabel || (articles.find((a: any) => a.serviceName === sale.serviceName)?.billByHour ? 'heure' : 'forfait')
    setFormData({
      saleDate: formatDateForInput(sale.saleDate),
      invoiceNo: sale.invoiceNo,
      clientName: sale.clientName,
      serviceName: sale.serviceName,
      quantity: sale.quantity,
      unitPriceHt: sale.unitPriceHt,
      unitLabel,
      selectedOptions: [],
      linkedCharges: linkedCharges
    })
    setHoursInput(unitLabel === 'heure' ? String(sale.quantity) : '')
    
    // Charger les options du service
    loadServiceOptions(sale.serviceName)
    
    // Charger les options sélectionnées
    if (sale.options) {
      try {
        const options = JSON.parse(sale.options)
        const selectedIds = options.filter((opt: any) => opt.selected).map((opt: any) => opt.id)
        setSelectedOptions(selectedIds)
    } catch {
      // Options invalides, ignorer
    }
    }
    
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    
    // Si facturation à l'heure, le nombre d'heures est obligatoire
    if (formData.unitLabel === 'heure') {
      const hours = parseFloat(hoursInput)
      if (hoursInput.trim() === '' || isNaN(hours) || hours < 0.5) {
        toast.error('Ventes', { description: 'Veuillez saisir le nombre d\'heures (minimum 0,5).' })
        return
      }
      setFormData(prev => ({ ...prev, quantity: hours }))
    }
    
    // Calculer le prix des options sélectionnées
    const selectedOptionsData = selectedServiceOptions
      .filter(option => selectedOptions.includes(option.id))
      .map(option => ({
        id: option.id,
        name: option.name,
        priceHt: option.priceHt,
        selected: true
      }))
    
    const optionsTotalHt = selectedOptionsData.reduce((sum, option) => sum + option.priceHt, 0)
    const quantityForTotal = formData.unitLabel === 'heure' ? (parseFloat(hoursInput) || 0) : formData.quantity
    const totalHt = (formData.unitPriceHt + optionsTotalHt) * quantityForTotal
    // Le calcul de la TVA se fait maintenant côté serveur avec le taux centralisé

    const quantityToSave = formData.unitLabel === 'heure' ? (parseFloat(hoursInput) || formData.quantity) : formData.quantity
    const saleData = {
      ...formData,
      quantity: quantityToSave,
      caHt: totalHt,
      options: JSON.stringify(selectedOptionsData),
      year: new Date(formData.saleDate).getFullYear()
    }

    const url = editingSale ? `/api/sales/${editingSale.invoiceNo}` : '/api/sales'
    const method = editingSale ? 'PUT' : 'POST'
    const previousSales = [...sales]

    const optimisticSale = {
      invoiceNo: formData.invoiceNo,
      saleDate: formData.saleDate,
      clientName: formData.clientName,
      serviceName: formData.serviceName,
      quantity: quantityToSave,
      unitPriceHt: formData.unitPriceHt,
      caHt: totalHt,
      totalTtc: totalHt * 1.2,
      tvaAmount: totalHt * 0.2,
    }
    if (editingSale) {
      const optimistic = sales.map(s =>
        s.invoiceNo === editingSale.invoiceNo ? { ...s, ...optimisticSale } : s
      )
      mutateSales({ sales: optimistic, pagination: salesData?.pagination }, { revalidate: false })
    } else {
      mutateSales({ sales: [...sales, optimisticSale], pagination: salesData?.pagination }, { revalidate: false })
    }

    try {
      const response = await electronFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      })

      if (response.ok) {
        const result = await response.json()
        const saleId = result.sale?.invoiceNo || editingSale?.invoiceNo

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

        await Promise.all([mutateSales(), mutateCharges()])
        setIsDialogOpen(false)
        setEditingSale(null)
        toast.success('Ventes', { description: editingSale ? 'Vente mise à jour.' : 'Vente enregistrée.' })
      } else {
        mutateSales({ sales: previousSales, pagination: salesData?.pagination }, { revalidate: false })
        const error = await response.json()
        toast.error('Ventes', { description: (error?.error ?? error?.message) || 'Erreur lors de la sauvegarde' })
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      mutateSales({ sales: previousSales, pagination: salesData?.pagination }, { revalidate: false })
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
    mutateSales({ sales: sales.filter(s => s.invoiceNo !== invoiceNo), pagination: salesData?.pagination }, { revalidate: false })
    try {
      const url = `/api/sales/${encodeURIComponent(invoiceNo)}`
      const response = await electronFetch(url, { method: 'DELETE' })
      if (response.ok) {
        await mutateSales()
        toast.success('Ventes', { description: 'Vente supprimée.' })
      } else {
        mutateSales({ sales: previousSales, pagination: salesData?.pagination }, { revalidate: false })
        const err = await response.json().catch(() => ({}))
        toast.error('Ventes', { description: err?.error || `Erreur lors de la suppression (${response.status})` })
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      mutateSales({ sales: previousSales, pagination: salesData?.pagination }, { revalidate: false })
      toast.error('Ventes', { description: 'Erreur lors de la suppression' })
    }
  }

  const enrichSaleForPdf = async (sale: any) => {
    const rate = await getDefaultTvaRate()
    const client = clients.find((c: any) => c.clientName === sale.clientName)
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleExportCSV} variant="outline">
            📊 Export CSV
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Vente
          </Button>
        </div>
      </div>
      
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <p className="text-sm text-foreground">
            💡 <strong>Astuce :</strong> Les options des services s&apos;affichent automatiquement lors de la création d&apos;une vente. Configurez d&apos;abord vos services dans la section Articles.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des ventes</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-foreground/80">Aucune vente trouvée.</p>
          ) : (
            <div className="space-y-2">
              {sales.map((sale, index) => (
                <div key={sale.invoiceNo || `sale-${index}`} className="border border-border rounded-lg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="font-medium">{sale.invoiceNo}</span>
                      <span className="text-foreground/70"> - </span>
                      {sale.clientName} - {sale.serviceName}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium tabular-nums">
                        {sale.totalTtc.toFixed(2)}€
                      </span>
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleGenerateQuote(sale)}>
                          📄 Devis
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleGenerateInvoice(sale)}>
                          🧾 Facture
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(sale)} aria-label="Modifier la vente">
                          ✏️
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(sale)} aria-label="Supprimer la vente">
                          🗑️
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog pour créer/modifier une vente */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSale ? 'Modifier la vente' : 'Nouvelle vente'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="saleDate">Date de vente</Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={formData.saleDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, saleDate: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="invoiceNo">N° Facture</Label>
                <Input
                  id="invoiceNo"
                  value={formData.invoiceNo}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceNo: e.target.value }))}
                  placeholder="F2026-000001"
                  maxLength={50}
                  pattern="[A-Za-z0-9\-]+"
                  title="Lettres, chiffres et tirets uniquement (pas de caractères spéciaux)"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientName">Client</Label>
                <Select value={formData.clientName} onValueChange={(value) => setFormData(prev => ({ ...prev, clientName: value }))}>
                  <SelectTrigger aria-label="Sélectionner un client">
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
              
              <div>
                <Label htmlFor="serviceName">Service</Label>
                <Select 
                  value={formData.serviceName} 
                  onValueChange={handleServiceChange}
                >
                  <SelectTrigger aria-label="Sélectionner un service">
                    <SelectValue placeholder="Sélectionner un service" />
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quantity">
                  {formData.unitLabel === 'heure' ? 'Nombre d\'heures *' : 'Quantité'}
                </Label>
                {formData.unitLabel === 'heure' ? (
                  <Input
                    id="quantity"
                    type="text"
                    inputMode="decimal"
                    value={hoursInput}
                    onChange={(e) => setHoursInput(e.target.value.replace(',', '.'))}
                    onBlur={() => {
                      const n = parseFloat(hoursInput.replace(',', '.'))
                      if (!isNaN(n) && n >= 0.5) {
                        setFormData(prev => ({ ...prev, quantity: n }))
                        setHoursInput(String(n))
                      }
                    }}
                    placeholder="Ex: 2.5"
                    required
                  />
                ) : (
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    required
                  />
                )}
                {formData.unitLabel === 'heure' && (
                  <p className="text-xs text-foreground/70 mt-1">Minimum 0,5 heure. Saisissez le nombre d&apos;heures.</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="unitPriceHt">
                  {formData.unitLabel === 'heure' ? 'Prix par heure HT' : 'Prix unitaire HT'}
                </Label>
                <Input
                  id="unitPriceHt"
                  type="number"
                  step="0.01"
                  value={formData.unitPriceHt}
                  onChange={(e) => setFormData(prev => ({ ...prev, unitPriceHt: parseFloat(e.target.value) || 0 }))}
                  required
                />
              </div>
              
              <div>
              </div>
            </div>

            {/* Section des options du service */}
            {formData.serviceName && selectedServiceOptions.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-medium">Options du service "{formData.serviceName}"</Label>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <p className="text-sm text-foreground/80 mb-3">
                    Sélectionnez les options à inclure dans cette vente :
                  </p>
                  <div className="space-y-2">
                    {selectedServiceOptions.map((option) => (
                      <div key={option.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={option.id}
                          checked={selectedOptions.includes(option.id)}
                          onCheckedChange={() => handleOptionToggle(option.id)}
                        />
                        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{option.name}</span>
                              {option.description && (
                                <span className="text-foreground/60 text-xs ml-2">({option.description})</span>
                              )}
                            </div>
                            <span className="text-sm font-medium">+{option.priceHt.toFixed(2)}€ HT</span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Résumé des options sélectionnées */}
                {selectedOptions.length > 0 && (
                  <div className="border rounded-lg p-3 bg-muted/50">
                    <p className="text-sm font-medium text-foreground mb-2">Options sélectionnées :</p>
                    <div className="space-y-1">
                      {selectedServiceOptions
                        .filter(option => selectedOptions.includes(option.id))
                        .map((option) => (
                          <div key={option.id} className="flex justify-between text-sm">
                            <span>{option.name}</span>
                            <span className="font-medium">+{option.priceHt.toFixed(2)}€ HT</span>
                          </div>
                        ))}
                      <div className="border-t pt-1 mt-2">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Total options HT :</span>
                          <span>
                            +{selectedServiceOptions
                              .filter(option => selectedOptions.includes(option.id))
                              .reduce((sum, option) => sum + option.priceHt, 0)
                              .toFixed(2)}€
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Section pour lier des charges */}
            {charges.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-medium">Charges liées (optionnel)</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                  <p className="text-sm text-foreground/80 mb-3">
                    Sélectionnez les charges à lier à cette vente
                  </p>
                  <div className="space-y-2">
                    {charges.map((charge) => (
                      <div key={charge.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`charge-${charge.id}`}
                          checked={formData.linkedCharges.includes(String(charge.id))}
                          onCheckedChange={() => handleChargeToggle(String(charge.id))}
                        />
                        <Label 
                          htmlFor={`charge-${charge.id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          <div className="flex justify-between items-center">
                            <span>
                              {charge.description || charge.vendor || 'Charge sans description'}
                            </span>
                            <span className="text-foreground/60 ml-2">
                              {charge.amount ? `${charge.amount.toFixed(2)}€` : 'Montant non défini'}
                            </span>
                          </div>
                          <div className="text-xs text-foreground/50">
                            {charge.category && `${charge.category} • `}
                            {new Date(charge.expenseDate).toLocaleDateString('fr-FR')}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Résumé des charges sélectionnées */}
                {formData.linkedCharges.length > 0 && (
                  <div className="border rounded-lg p-3 bg-muted/50">
                    <p className="text-sm font-medium text-foreground mb-2">Charges liées :</p>
                    <div className="space-y-1">
                      {charges
                        .filter(charge => formData.linkedCharges.includes(String(charge.id)))
                        .map((charge) => (
                          <div key={charge.id} className="flex justify-between text-sm">
                            <span>{charge.description || charge.vendor || 'Charge sans description'}</span>
                            <span className="font-medium">
                              {charge.amount ? `${charge.amount.toFixed(2)}€` : 'Montant non défini'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">
                {editingSale ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}