'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'
import { safeErrorMessage } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, Euro, FileText, Download, Trash2, Upload, Image, AlertTriangle } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { SWR_KEYS, fetchSettings } from '@/lib/swr-fetchers'
import { SWR_CACHE_LONG_OPTIONS } from '@/lib/swr-config'

interface ParametresEntreprise {
  key: string
  value: string
}

export function SettingsContent() {
  const { data, error, isLoading, mutate } = useSWR(SWR_KEYS.settings, fetchSettings, SWR_CACHE_LONG_OPTIONS)
  const [editingParam, setEditingParam] = useState<string | null>(null)
  const [newValue, setNewValue] = useState('')
  const [uploading, setUploading] = useState(false)

  // States for confirmations
  const [isLogoDeleteDialogOpen, setIsLogoDeleteDialogOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isReseting, setIsReseting] = useState(false)
  const [isDeletingLogo, setIsDeletingLogo] = useState(false)

  const parameters: ParametresEntreprise[] = data?.parameters ?? []
  const logoPath = parameters.find(p => p.key === 'logoPath')?.value ?? ''

  const handleUpdateParameter = async (key: string, value: string) => {
    try {
      const res = await electronFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) {
        await mutate()
        setEditingParam(null)
        setNewValue('')
      } else {
        const err = await res.json().catch(() => ({}))
        const msg = err.error || err.message || (typeof err.details === 'string' ? err.details : `Erreur ${res.status}`)
        toast.error('Paramètres', { description: msg })
      }
    } catch (e) {
      console.error('Settings:', e)
      toast.error('Paramètres', { description: safeErrorMessage(e, 'Erreur inconnue') })
    }
  }

  const handleExportData = async () => {
    try {
      const res = await electronFetch('/api/export')
      if (!res.ok) return
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ares-dashboard-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (e) {
      console.error('Export:', e)
      toast.error('Paramètres', { description: "Erreur lors de l'export" })
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      const fd = new FormData()
      fd.append('logo', file)
      const res = await electronFetch('/api/upload-logo', { method: 'POST', body: fd })

      if (res.ok) {
        toast.success('Paramètres', { description: 'Logo uploadé avec succès !' })
        await mutate()
      } else toast.error('Paramètres', { description: (await res.json()).error })
    } catch (e) {
      console.error('Logo:', e)
      toast.error('Paramètres', { description: "Erreur lors de l'upload du logo" })
    } finally {
      setUploading(false)
    }
  }

  const handleLogoDelete = async () => {
    setIsLogoDeleteDialogOpen(true)
  }

  const handleConfirmLogoDelete = async () => {
    setIsDeletingLogo(true)
    try {
      const res = await electronFetch('/api/upload-logo', { method: 'DELETE' })
      if (res.ok) {
        toast.success('Paramètres', { description: 'Logo supprimé !' })
        await mutate()
      } else toast.error('Paramètres', { description: 'Erreur lors de la suppression' })
    } catch (e) {
      console.error('Logo:', e)
      toast.error('Paramètres', { description: 'Erreur suppression logo' })
    } finally {
      setIsDeletingLogo(false)
      setIsLogoDeleteDialogOpen(false)
    }
  }

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        const res = await electronFetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (res.ok) {
          toast.success('Paramètres', { description: 'Import réussi !' })
          window.location.reload()
        } else toast.error('Paramètres', { description: "Erreur lors de l'import" })
      } catch (err) {
        console.error('Import:', err)
        toast.error('Paramètres', { description: "Erreur lors de l'import" })
      }
    }
    reader.readAsText(file)
  }

  const handleResetDatabase = async () => {
    setIsResetDialogOpen(true)
  }

  const handleConfirmResetDatabase = async () => {
    setIsReseting(true)
    try {
      const res = await electronFetch('/api/reset', { method: 'POST' })
      if (res.ok) {
        toast.success('Paramètres', { description: 'Base réinitialisée !' })
        window.location.reload()
      } else toast.error('Paramètres', { description: 'Erreur réinitialisation' })
    } catch (e) {
      console.error('Reset:', e)
      toast.error('Paramètres', { description: 'Erreur réinitialisation' })
    } finally {
      setIsReseting(false)
      setIsResetDialogOpen(false)
    }
  }

  const getParameterValue = (key: string) => {
    const param = parameters.find(p => p.key === key)
    return param?.value || ''
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full max-w-[1600px] mx-auto py-4 sm:py-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive font-medium">Erreur lors du chargement des paramètres</p>
          <p className="text-sm text-foreground/80 mt-1">{error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => mutate()}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Paramètres</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations Entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="companyName">Nom de l&apos;entreprise</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="companyName"
                  value={editingParam === 'companyName' ? newValue : getParameterValue('companyName')}
                  onChange={(e) => setNewValue(e.target.value)}
                  onFocus={() => {
                    setEditingParam('companyName')
                    setNewValue(getParameterValue('companyName'))
                  }}
                  className="transition-all border-transparent bg-muted/20 hover:border-primary/30 focus:bg-background focus:border-input"
                />
                {editingParam === 'companyName' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateParameter('companyName', newValue)}
                  >
                    Sauvegarder
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="companyAddress">Adresse</Label>
              <div className="flex gap-2 mt-1">
                <Textarea
                  id="companyAddress"
                  value={editingParam === 'companyAddress' ? newValue : getParameterValue('companyAddress')}
                  onChange={(e) => setNewValue(e.target.value)}
                  onFocus={() => {
                    setEditingParam('companyAddress')
                    setNewValue(getParameterValue('companyAddress'))
                  }}
                  className="transition-all border-transparent bg-muted/20 hover:border-primary/30 focus:bg-background focus:border-input"
                />
                {editingParam === 'companyAddress' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateParameter('companyAddress', newValue)}
                  >
                    Sauvegarder
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="companyPhone">Téléphone</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="companyPhone"
                  value={editingParam === 'companyPhone' ? newValue : getParameterValue('companyPhone')}
                  onChange={(e) => setNewValue(e.target.value)}
                  onFocus={() => {
                    setEditingParam('companyPhone')
                    setNewValue(getParameterValue('companyPhone'))
                  }}
                  className="transition-all border-transparent bg-muted/20 hover:border-primary/30 focus:bg-background focus:border-input"
                />
                {editingParam === 'companyPhone' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateParameter('companyPhone', newValue)}
                  >
                    Sauvegarder
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="companyEmail">Email</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="companyEmail"
                  type="email"
                  value={editingParam === 'companyEmail' ? newValue : getParameterValue('companyEmail')}
                  onChange={(e) => setNewValue(e.target.value)}
                  onFocus={() => {
                    setEditingParam('companyEmail')
                    setNewValue(getParameterValue('companyEmail'))
                  }}
                  className="transition-all border-transparent bg-muted/20 hover:border-primary/30 focus:bg-background focus:border-input"
                />
                {editingParam === 'companyEmail' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateParameter('companyEmail', newValue)}
                  >
                    Sauvegarder
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="siret">SIRET</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="siret"
                  placeholder="14 chiffres"
                  maxLength={14}
                  value={editingParam === 'siret' ? newValue : getParameterValue('siret')}
                  onChange={(e) => setNewValue(e.target.value.replace(/\D/g, '').slice(0, 14))}
                  onFocus={() => {
                    setEditingParam('siret')
                    setNewValue(getParameterValue('siret'))
                  }}
                  className="transition-all border-transparent bg-muted/20 hover:border-primary/30 focus:bg-background focus:border-input"
                />
                {editingParam === 'siret' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateParameter('siret', newValue)}
                  >
                    Sauvegarder
                  </Button>
                )}
              </div>
              <p className="text-xs text-foreground/70 mt-1">Affiché sur les devis et factures</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" aria-hidden />
              Logo de l&apos;entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {logoPath ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src={logoPath}
                    alt="Logo entreprise"
                    className="h-16 w-16 object-contain border rounded"
                    loading="lazy"
                    width={64}
                    height={64}
                  />
                  <div>
                    <p className="text-sm text-foreground/80">Logo actuel</p>
                    <p className="text-xs text-foreground/70">Utilisé dans les devis et factures</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Remplacer
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogoDelete}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
                  <Image className="h-12 w-12 mx-auto text-foreground/50 mb-4" aria-hidden />
                  <p className="text-foreground/70 mb-4">Aucun logo uploadé</p>
                  <label className="cursor-pointer">
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? 'Upload en cours...' : 'Uploader un logo'}
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
                <div className="text-xs text-foreground/70">
                  <p>Formats supportés: PNG, JPG, SVG</p>
                  <p>Taille maximale: 5MB</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Paramètres Financiers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="defaultTvaRate">Taux TVA par défaut (%)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="defaultTvaRate"
                  type="number"
                  step="0.01"
                  value={editingParam === 'defaultTvaRate' ? newValue : getParameterValue('defaultTvaRate')}
                  onChange={(e) => setNewValue(e.target.value)}
                  onFocus={() => {
                    setEditingParam('defaultTvaRate')
                    setNewValue(getParameterValue('defaultTvaRate'))
                  }}
                  className="transition-all border-transparent bg-muted/20 hover:border-primary/30 focus:bg-background focus:border-input"
                />
                {editingParam === 'defaultTvaRate' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateParameter('defaultTvaRate', newValue)}
                  >
                    Sauvegarder
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="tauxUrssaf">Taux URSSAF (%)</Label>
              <p className="text-xs text-foreground/70 mt-0.5 mb-1">
                Prélevé directement sur le CA HT (ex. 22% = 22% du chiffre d&apos;affaires HT).
              </p>
              <div className="flex gap-2 mt-1">
                <Input
                  id="tauxUrssaf"
                  type="number"
                  step="0.01"
                  value={editingParam === 'tauxUrssaf' ? newValue : getParameterValue('tauxUrssaf')}
                  onChange={(e) => setNewValue(e.target.value)}
                  onFocus={() => {
                    setEditingParam('tauxUrssaf')
                    setNewValue(getParameterValue('tauxUrssaf'))
                  }}
                  className="transition-all border-transparent bg-muted/20 hover:border-primary/30 focus:bg-background focus:border-input"
                />
                {editingParam === 'tauxUrssaf' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateParameter('tauxUrssaf', newValue)}
                  >
                    Sauvegarder
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gestion des Données
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={handleExportData} variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Exporter toutes les données
              </Button>
            </div>

            <div>
              <Label htmlFor="importFile">Importer des données</Label>
              <Input
                id="importFile"
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="mt-1"
              />
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={handleResetDatabase}
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Réinitialiser la base de données
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
      <ConfirmDialog
        isOpen={isLogoDeleteDialogOpen}
        onOpenChange={setIsLogoDeleteDialogOpen}
        title="Supprimer le logo"
        description="Êtes-vous sûr de vouloir supprimer le logo de l'entreprise ? Cette action est irréversible."
        onConfirm={handleConfirmLogoDelete}
        isLoading={isDeletingLogo}
      />

      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onOpenChange={setIsResetDialogOpen}
        title="Réinitialiser la base de données"
        description="ATTENTION : Cette action supprimera DÉFINITIVEMENT toutes vos données (ventes, charges, clients, articles). Cette action est irréversible. Voulez-vous continuer ?"
        onConfirm={handleConfirmResetDatabase}
        isLoading={isReseting}
      />
    </div>
  )
}
