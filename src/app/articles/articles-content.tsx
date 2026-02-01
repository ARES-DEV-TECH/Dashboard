'use client'

import { useState } from 'react'
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
import { Settings, Plus, Trash2 } from 'lucide-react'
import { Article } from '@/lib/validations'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { SWR_KEYS, fetchArticles } from '@/lib/swr-fetchers'

interface ServiceOption {
  id: string
  name: string
  description?: string
  priceHt: number
  isDefault: boolean
}

export function ArticlesContent() {
  const { data: articles = [], error, isLoading, mutate } = useSWR<Article[]>(SWR_KEYS.articles, fetchArticles, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  })
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
        await mutate()
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

  const columns: Column<Article>[] = [
    {
      key: 'serviceName',
      label: 'Nom du service',
      sortable: true,
    },
    {
      key: 'priceHt',
      label: 'Prix HT',
      sortable: true,
    },
    {
      key: 'billByHour',
      label: 'Facturation',
      render: (value) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'À l\'heure' : 'Forfait'}
        </Badge>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (value) => (
        <Badge variant={value === 'service' ? 'default' : 'secondary'}>
          {value === 'service' ? 'Service' : 'Produit'}
        </Badge>
      ),
    },
    {
      key: 'billingFrequency',
      label: 'Régularité',
      render: (value) => (
        <Badge variant="outline">
          {value === 'annuel' ? 'Annuel' : value === 'mensuel' ? 'Mensuel' : 'Ponctuel'}
        </Badge>
      ),
    },
    {
      key: 'actions' as any, // Clé unique pour la colonne Actions
      label: 'Actions',
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
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
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
      {/* Guide de workflow */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
              1
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Créer vos services et options</h3>
            <p className="text-sm text-blue-800 mb-3">
              Configurez d'abord vos services et leurs options personnalisables. Utilisez le bouton ⚙️ pour ajouter des options à chaque service.
            </p>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• <strong>Créer un service :</strong> Bouton "Créer un article" ci-dessous</p>
              <p>• <strong>Ajouter des options :</strong> Cliquez sur ⚙️ dans le tableau</p>
              <p>• <strong>Exemple d'options :</strong> "Base de données", "Design sur mesure", "Formation"</p>
            </div>
          </div>
        </div>
      </div>
      
      <DataTable
        data={articles}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onExport={handleExport}
        searchPlaceholder="Rechercher un article..."
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
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="serviceName">Nom du service *</Label>
              <Input
                id="serviceName"
                value={formData.serviceName || ''}
                onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                placeholder="Nom du service"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="billByHour"
                checked={!!formData.billByHour}
                onCheckedChange={(checked) => setFormData({ ...formData, billByHour: !!checked })}
              />
              <Label htmlFor="billByHour" className="cursor-pointer">
                Facturer à l&apos;heure
              </Label>
            </div>
            {formData.billByHour && (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                Le <strong>nombre d&apos;heures</strong> se saisit lors de l&apos;enregistrement d&apos;une vente (page <strong>Ventes</strong>) : choisissez ce service puis renseignez le champ &quot;Nombre d&apos;heures&quot;.
              </p>
            )}
            
            <div>
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
              />
            </div>
            
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type || 'service'}
                onValueChange={(value) => setFormData({ ...formData, type: value as 'service' | 'produit' })}
              >
                <SelectTrigger aria-label="Type d'article">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="produit">Produit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="billingFrequency">Régularité de facturation</Label>
              <Select
                value={formData.billingFrequency || 'ponctuel'}
                onValueChange={(value) => setFormData({ ...formData, billingFrequency: value as 'annuel' | 'mensuel' | 'ponctuel' })}
              >
                <SelectTrigger aria-label="Régularité de facturation">
                  <SelectValue placeholder="Pour le dashboard (CA annualisé)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ponctuel">Ponctuel</SelectItem>
                  <SelectItem value="mensuel">Mensuel</SelectItem>
                  <SelectItem value="annuel">Annuel</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-foreground/70 mt-1">
                Annuel = montant pris en compte pour l&apos;année (ex. hébergement). Mensuel = équivalent ×12 sur l&apos;année.
              </p>
            </div>
            
            {saveError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {saveError}
              </p>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={() => { setIsDialogOpen(false); setSaveError(null) }}>
                Annuler
              </Button>
              <Button type="button" onClick={handleSave}>
                {editingArticle ? 'Modifier' : 'Créer'}
              </Button>
            </div>
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
