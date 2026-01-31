"use client"

import { useState, useEffect } from 'react'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { electronFetch } from '@/lib/electron-api'
import { Skeleton } from '@/components/ui/skeleton'
// Icons are used in DataTable component
import { Client } from '@/lib/validations'
import { generateCSV, downloadCSV } from '@/lib/csv'

export function ClientsContent() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState<Partial<Client>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const response = await electronFetch('/api/clients')
      const data = await response.json()
      setClients(data)
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaveError(null)
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      setSaveError('Le prénom et le nom sont requis.')
      return
    }
    try {
      const url = editingClient && editingClient.clientName
        ? `/api/clients/${encodeURIComponent(editingClient.clientName)}`
        : '/api/clients'
      const method = editingClient ? 'PUT' : 'POST'

      const response = await electronFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        await loadClients()
        setIsDialogOpen(false)
        setEditingClient(null)
        setFormData({})
        setSaveError(null)
      } else {
        const detailsStr = typeof data?.details === 'string'
          ? data.details
          : Array.isArray(data?.details)
            ? data.details.map((d: { message?: string }) => d.message).filter(Boolean).join(', ')
            : ''
        setSaveError(data?.error || detailsStr || `Erreur ${response.status}`)
      }
    } catch (error) {
      console.error('Error saving client:', error)
      setSaveError('Erreur réseau ou serveur. Réessayez.')
    }
  }

  const handleEdit = (client: Client) => {
    setSaveError(null)
    setEditingClient(client)
    setFormData(client)
    setIsDialogOpen(true)
  }

  const handleDelete = async (client: Client) => {
    const displayName = [client.firstName, client.lastName].filter(Boolean).join(' ') || client.clientName || 'Ce client'
    if (confirm(`Êtes-vous sûr de vouloir supprimer le client "${displayName}" ?`)) {
      try {
        const clientId = client.clientName ?? [client.firstName, client.lastName].filter(Boolean).join(' ') ?? ''
        const response = await electronFetch(`/api/clients/${encodeURIComponent(clientId)}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          await loadClients()
        }
      } catch (error) {
        console.error('Error deleting client:', error)
      }
    }
  }

  const handleExport = () => {
    const csvContent = generateCSV(clients, ['firstName', 'lastName', 'clientName', 'email', 'phone', 'website', 'company'])
    downloadCSV(csvContent, `clients-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const handleAdd = () => {
    setSaveError(null)
    setEditingClient(null)
    setFormData({})
    setIsDialogOpen(true)
  }

  const columns: Column<Client>[] = [
    {
      key: 'firstName',
      label: 'Prénom',
      sortable: true,
    },
    {
      key: 'lastName',
      label: 'Nom',
      sortable: true,
    },
    {
      key: 'email',
      label: 'Email',
      render: (value) => value ? (
        <a href={`mailto:${String(value)}`} className="text-blue-600 hover:underline">
          {String(value)}
        </a>
      ) : (
        <span className="text-foreground/70">Non renseigné</span>
      ),
    },
    {
      key: 'phone',
      label: 'Téléphone',
      render: (value) => value ? (
        <a href={`tel:${String(value)}`} className="text-blue-600 hover:underline">
          {String(value)}
        </a>
      ) : (
        <span className="text-foreground/70">Non renseigné</span>
      ),
    },
    {
      key: 'company',
      label: 'Entreprise',
      render: (value) => value ? String(value) : <span className="text-foreground/70">Non renseigné</span>,
    },
    {
      key: 'website',
      label: 'Site web',
      render: (value) => value ? (
        <a href={String(value).startsWith('http') ? String(value) : `https://${String(value)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {String(value)}
        </a>
      ) : (
        <span className="text-foreground/70">Non renseigné</span>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="w-full min-w-0 py-4 sm:py-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-10 w-32" />
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
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Astuce :</strong> Utilisez les boutons d&apos;actions (✏️ Modifier, 🗑️ Supprimer) dans la colonne de droite pour gérer vos clients.
        </p>
      </div>
      
      <DataTable
        data={clients}
        columns={columns}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onExport={handleExport}
        searchPlaceholder="Rechercher un client..."
      />

      {/* Add/Edit Client Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Modifier le client' : 'Nouveau client'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName || ''}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Prénom"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Nom"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemple.com"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="06 12 34 56 78"
              />
            </div>
            
            <div>
              <Label htmlFor="company">Entreprise</Label>
              <Input
                id="company"
                value={formData.company || ''}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Nom de l'entreprise"
              />
            </div>
            
            <div>
              <Label htmlFor="website">Site web</Label>
              <Input
                id="website"
                type="url"
                value={formData.website || ''}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.exemple.com"
              />
            </div>

            {saveError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {saveError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2">
              <Button variant="outline" type="button" onClick={() => { setIsDialogOpen(false); setSaveError(null) }}>
                Annuler
              </Button>
              <Button type="button" onClick={handleSave}>
                {editingClient ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
