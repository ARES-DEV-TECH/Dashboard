'use client'

import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings, Plus, Trash2, Columns3, Package, Banknote } from 'lucide-react'
import { Article } from '@/lib/validations'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { SWR_KEYS, fetchArticles } from '@/lib/swr-fetchers'
import { SWR_LIST_OPTIONS } from '@/lib/swr-config'

const ARTICLES_COLUMNS_STORAGE_KEY = 'articles-table-columns'
const DEFAULT_ARTICLES_COLUMN_VISIBILITY: Record<string, boolean> = {
  serviceName: true,
  priceHt: true,
  billByHour: true,
  type: true,
  billingFrequency: true,
  actions: true,
}

interface ServiceOption {
  id: string
  name: string
  description?: string
  priceHt: number
  isDefault: boolean
}

export function ArticlesContent() {
  const { data: articles = [], error, isLoading, mutate } = useSWR<Article[]>(SWR_KEYS.articles, fetchArticles, SWR_LIST_OPTIONS)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)
  const [formData, setFormData] = useState<Partial<Article>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<Article | null>(null)
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([])
  const [newOption, setNewOption] = useState({
    name: '',
    description: '',
    priceHt: 0,
    isDefault: false
  })
  const loading = isLoading

  const loadServiceOptions = async (serviceName: string) => {
    try {
      const res = await electronFetch(`/api/service-options?serviceName=${encodeURIComponent(serviceName)}`)
      if (res.ok) setServiceOptions((await res.json()).options || [])
      else setServiceOptions([])
    } catch {
      setServiceOptions([])
    }
  }

  const handleOpenOptionsDialog = (service: Article) => {
    setSelectedService(service)
    setIsOptionsDialogOpen(true)
    loadServiceOptions(service.serviceName)
  }

  const handleAddOption = async () => {
    if (!selectedService || !newOption.name.trim()) return
    try {
      const res = await electronFetch('/api/service-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName: selectedService.serviceName, ...newOption }),
      })
      if (res.ok) {
        await loadServiceOptions(selectedService.serviceName)
        setNewOption({ name: '', description: '', priceHt: 0, isDefault: false })
        toast.success('Articles', { description: 'Option ajoutée.' })
      } else toast.error('Articles', { description: (await res.json()).error })
    } catch (e) {
      console.error('Option:', e)
      toast.error('Articles', { description: "Erreur lors de l'ajout de l'option" })
    }
  }

  const handleDeleteOption = async (optionId: string) => {
    if (!confirm('Supprimer cette option ?')) return
    try {
      const res = await electronFetch(`/api/service-options/${optionId}`, { method: 'DELETE' })
      if (res.ok) await loadServiceOptions(selectedService!.serviceName)
      else toast.error('Articles', { description: "Erreur lors de la suppression" })
    } catch (e) {
      console.error('Option:', e)
      toast.error('Articles', { description: "Erreur lors de la suppression" })
    }
  }

  const handleSave = async () => {
    setSaveError(null)
    const price = typeof formData.priceHt === 'number' ? formData.priceHt : parseFloat(String(formData.priceHt ?? ''))
    if (!formData.serviceName?.trim()) {
      setSaveError('Le nom du service est requis.')
      return
    }
    if (Number.isNaN(price) || price <= 0) {
      setSaveError('Le prix HT doit être un nombre strictement positif.')
      return
    }
    const payload = {
      serviceName: formData.serviceName.trim(),
      priceHt: price,
      billByHour: !!formData.billByHour,
      billingFrequency: formData.billingFrequency || 'ponctuel',
      type: formData.type || 'service',
    }
    const url = editingArticle ? `/api/articles/${encodeURIComponent(editingArticle.serviceName)}` : '/api/articles'
    const method = editingArticle ? 'PUT' : 'POST'
    const previousArticles = [...articles]

    if (editingArticle) {
      const optimistic = articles.map(a =>
        a.serviceName === editingArticle.serviceName ? { ...a, ...payload } : a
      )
      mutate(optimistic, { revalidate: false })
    } else {
      mutate([...articles, { ...payload } as Article], { revalidate: false })
    }

    try {
      const res = await electronFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (data && typeof data === 'object' && 'serviceName' in data) {
          if (editingArticle) {
            mutate(articles.map((a) => (a.serviceName === editingArticle.serviceName ? (data as Article) : a)), { revalidate: false })
          } else {
            mutate([...articles.filter((a) => a.serviceName !== (data as Article).serviceName), data as Article], { revalidate: false })
          }
        } else {
          await mutate()
        }
        setIsDialogOpen(false)
        setEditingArticle(null)
        setFormData({})
        setSaveError(null)
        toast.success('Articles', { description: editingArticle ? 'Article mis à jour.' : 'Article créé.' })
      } else {
        mutate(previousArticles, { revalidate: false })
        const detailsStr = typeof data?.details === 'string'
          ? data.details
          : Array.isArray(data?.details)
            ? data.details.map((d: { message?: string }) => d.message).filter(Boolean).join(', ')
            : ''
        const base = data?.error || `Erreur ${res.status}`
        const message = detailsStr ? `${base}: ${detailsStr}` : base
        setSaveError(message)
        toast.error('Articles', { description: message })
      }
    } catch (e) {
      console.error('Article:', e)
      mutate(previousArticles, { revalidate: false })
      setSaveError('Erreur réseau ou serveur. Réessayez.')
      toast.error('Articles', { description: 'Erreur réseau ou serveur. Réessayez.' })
    }
  }

  const handleEdit = (article: Article) => {
    setSaveError(null)
    setEditingArticle(article)
    setFormData(article)
    setIsDialogOpen(true)
  }

  const handleDelete = async (article: Article) => {
    if (!confirm(`Supprimer l'article "${article.serviceName}" ?`)) return
    const previousArticles = [...articles]
    mutate(articles.filter(a => a.serviceName !== article.serviceName), { revalidate: false })
    try {
      const res = await electronFetch(`/api/articles/${encodeURIComponent(article.serviceName)}`, { method: 'DELETE' })
      if (res.ok) {
        await mutate()
        toast.success('Articles', { description: 'Article supprimé.' })
      } else {
        const data = await res.json().catch(() => ({}))
        mutate(previousArticles, { revalidate: false })
        toast.error('Articles', { description: data?.error || 'Erreur lors de la suppression' })
      }
    } catch (e) {
      console.error('Article:', e)
      mutate(previousArticles, { revalidate: false })
      toast.error('Articles', { description: 'Erreur lors de la suppression' })
    }
  }

  const handleExport = () => {
    const csvContent = generateCSV(articles, ['serviceName', 'priceHt', 'billByHour', 'type'])
    downloadCSV(csvContent, `articles-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const handleAdd = () => {
    setSaveError(null)
    setEditingArticle(null)
    setFormData({})
    setIsDialogOpen(true)
  }

  useEffect(() => {
    const handler = () => handleAdd()
    window.addEventListener('shortcut-new', handler)
    return () => window.removeEventListener('shortcut-new', handler)
  }, [])

  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return { ...DEFAULT_ARTICLES_COLUMN_VISIBILITY }
    try {
      const stored = window.localStorage.getItem(ARTICLES_COLUMNS_STORAGE_KEY)
      if (!stored) return { ...DEFAULT_ARTICLES_COLUMN_VISIBILITY }
      const parsed = JSON.parse(stored) as Record<string, boolean>
      return { ...DEFAULT_ARTICLES_COLUMN_VISIBILITY, ...parsed }
    } catch {
      return { ...DEFAULT_ARTICLES_COLUMN_VISIBILITY }
    }
  })

  const saveColumnVisibility = (next: Record<string, boolean>) => {
    setColumnVisibility(next)
    try {
      window.localStorage.setItem(ARTICLES_COLUMNS_STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }

  const toggleColumn = (key: string) => {
    const visibleCount = Object.values(columnVisibility).filter(Boolean).length
    const currentlyVisible = columnVisibility[key] !== false
    if (currentlyVisible && visibleCount <= 1) return
    saveColumnVisibility({ ...columnVisibility, [key]: !currentlyVisible })
  }

  const columns: Column<Article>[] = useMemo(
    () => [
      { key: 'serviceName', label: 'Nom du service', sortable: true, sortLabel: 'alpha' },
      { key: 'priceHt', label: 'Prix HT', sortable: true, sortLabel: 'numeric' },
      {
        key: 'billByHour',
        label: 'Facturation',
        sortable: true,
        sortLabel: 'alpha',
        render: (value) => (
          <Badge variant={value ? 'default' : 'secondary'}>
            {value ? 'À l\'heure' : 'Forfait'}
          </Badge>
        ),
      },
      {
        key: 'type',
        label: 'Type',
        sortable: true,
        sortLabel: 'alpha',
        render: (value) => (
          <Badge variant={value === 'service' ? 'default' : 'secondary'}>
            {value === 'service' ? 'Service' : 'Produit'}
          </Badge>
        ),
      },
      {
        key: 'billingFrequency',
        label: 'Régularité',
        sortable: true,
        sortLabel: 'alpha',
        render: (value) => (
          <Badge variant="outline">
            {value === 'annuel' ? 'Annuel' : value === 'mensuel' ? 'Mensuel' : 'Ponctuel'}
          </Badge>
        ),
      },
      {
        key: 'actions' as keyof Article,
        label: 'Options',
        render: (_, article) => (
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenOptionsDialog(article)}
              title="Gérer les options"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        ),
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

  if (loading && articles.length === 0) {
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Erreur lors du chargement des articles</p>
          <p className="text-sm mt-1">{error.message}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => mutate()}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <div className="p-4">
          <p className="text-sm text-foreground/80">
            💡 <strong>Astuce :</strong> Configurez d'abord vos services et leurs options personnalisables. Utilisez le bouton ⚙️ pour ajouter des options à chaque service.
          </p>
        </div>
      </Card>
      
      <DataTable
        data={articles}
        columns={visibleColumns}
        toolbarExtra={columnsPopover}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onExport={handleExport}
        searchPlaceholder="Rechercher un article..."
        emptyMessage="Aucun article. Créez votre premier service."
        virtualized
      />

      {/* Add/Edit Article Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? 'Modifier l\'article' : 'Nouvel article'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-lg border space-y-4 h-full">
                <h3 className="font-medium text-sm flex items-center gap-2 text-foreground/80">
                  <Package className="size-4" /> Détails
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="serviceName">Nom du service *</Label>
                  <Input
                    id="serviceName"
                    value={formData.serviceName || ''}
                    onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                    placeholder="Nom du service"
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type || 'service'}
                    onValueChange={(value) => setFormData({ ...formData, type: value as 'service' | 'produit' })}
                  >
                    <SelectTrigger aria-label="Type d'article" className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="produit">Produit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-lg border space-y-4 h-full">
                <h3 className="font-medium text-sm flex items-center gap-2 text-foreground/80">
                  <Banknote className="size-4" /> Tarification
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 bg-background p-2 rounded border">
                    <Checkbox
                      id="billByHour"
                      checked={!!formData.billByHour}
                      onCheckedChange={(checked) => setFormData({ ...formData, billByHour: !!checked })}
                    />
                    <Label htmlFor="billByHour" className="cursor-pointer flex-1">
                      Facturer à l&apos;heure
                    </Label>
                  </div>
                  
                  {formData.billByHour && (
                    <p className="text-xs text-muted-foreground bg-blue-500/10 text-blue-600 rounded px-2 py-1.5 border border-blue-200 dark:border-blue-900">
                      Le nombre d&apos;heures sera demandé lors de la vente.
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="priceHt">
                      {formData.billByHour ? 'Prix HT par heure *' : 'Prix HT (forfait) *'}
                    </Label>
                    <Input
                      id="priceHt"
                      type="number"
                      step="0.01"
                      value={formData.priceHt ?? ''}
                      onChange={(e) => setFormData({ ...formData, priceHt: parseFloat(e.target.value) || 0 })}
                      placeholder={formData.billByHour ? 'Ex: 85' : 'Ex: 500'}
                      className="bg-background"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="billingFrequency">Régularité (Dashboard)</Label>
                    <Select
                      value={formData.billingFrequency || 'ponctuel'}
                      onValueChange={(value) => setFormData({ ...formData, billingFrequency: value as 'annuel' | 'mensuel' | 'ponctuel' })}
                    >
                      <SelectTrigger aria-label="Régularité de facturation" className="bg-background">
                        <SelectValue placeholder="Pour le dashboard" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ponctuel">Ponctuel</SelectItem>
                        <SelectItem value="mensuel">Mensuel (x12)</SelectItem>
                        <SelectItem value="annuel">Annuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" type="button" onClick={() => { setIsDialogOpen(false); setSaveError(null) }}>
                Annuler
              </Button>
              <Button type="button" onClick={handleSave}>
                {editingArticle ? 'Modifier' : 'Créer'}
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pour gérer les options de services */}
      <Dialog open={isOptionsDialogOpen} onOpenChange={setIsOptionsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Options pour "{selectedService?.serviceName}"</span>
            </DialogTitle>
            <p className="text-sm text-foreground/80">
              Ajoutez des options personnalisables que vos clients pourront sélectionner dans leurs devis
            </p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Formulaire pour ajouter une nouvelle option */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ajouter une option</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="optionName">Nom de l'option *</Label>
                    <Input
                      id="optionName"
                      value={newOption.name}
                      onChange={(e) => setNewOption(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="ex: Base de données"
                    />
                  </div>
                  <div>
                    <Label htmlFor="optionPrice">Prix HT (€)</Label>
                    <Input
                      id="optionPrice"
                      type="number"
                      step="0.01"
                      value={newOption.priceHt}
                      onChange={(e) => setNewOption(prev => ({ ...prev, priceHt: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="optionDescription">Description</Label>
                  <Textarea
                    id="optionDescription"
                    value={newOption.description}
                    onChange={(e) => setNewOption(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Description de l'option..."
                    rows={2}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isDefault"
                    checked={newOption.isDefault}
                    onCheckedChange={(checked) => setNewOption(prev => ({ ...prev, isDefault: !!checked }))}
                  />
                  <Label htmlFor="isDefault">Option incluse par défaut</Label>
                </div>
                
                <Button onClick={handleAddOption} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter l'option
                </Button>
              </CardContent>
            </Card>

            {/* Liste des options existantes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Options existantes</CardTitle>
              </CardHeader>
              <CardContent>
                {serviceOptions.length === 0 ? (
                  <p className="text-foreground/80 text-center py-4">
                    Aucune option définie pour ce service
                  </p>
                ) : (
                  <div className="space-y-3">
                    {serviceOptions.map((option) => (
                      <div key={option.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{option.name}</span>
                            {option.isDefault && (
                              <Badge variant="secondary" className="text-xs">Par défaut</Badge>
                            )}
                          </div>
                          {option.description && (
                            <p className="text-sm text-foreground/70 mt-1">{option.description}</p>
                          )}
                          <p className="text-sm text-foreground/70">
                            +{option.priceHt.toFixed(2)} € HT
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteOption(option.id)}
                          className="text-red-600 hover:text-red-700"
                          aria-label="Supprimer l'option"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsOptionsDialogOpen(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
