"use client"

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResponsiveDialog } from '@/components/responsive-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Columns3, User, Building2, Edit, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Client } from '@/lib/validations'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { SWR_KEYS, fetchClients } from '@/lib/swr-fetchers'
import { SWR_LIST_OPTIONS } from '@/lib/swr-config'
import { getInitials } from '@/lib/utils'
import { useCrudList } from '@/hooks/use-crud-list'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { handleApiError } from '@/lib/error-handler'

const CLIENTS_COLUMNS_STORAGE_KEY = 'clients-table-columns'
const DEFAULT_CLIENTS_COLUMN_VISIBILITY: Record<string, boolean> = {
  clientName: true,
  firstName: true,
  lastName: true,
  company: true,
  email: true,
  phone: true,
  website: true,
}

export function ClientsContent() {
  const { data: clients = [], error, isLoading, mutate } = useSWR<Client[]>(SWR_KEYS.clients, fetchClients, SWR_LIST_OPTIONS)
  const [formData, setFormData] = useState<Partial<Client>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  const loading = isLoading

  // Use new reusable hooks
  const crud = useCrudList<Client>({
    onAdd: () => {
      setSaveError(null)
      setFormData({})
    },
    onEdit: (client) => {
      setSaveError(null)
      setFormData(client)
    },
  })

  const { columnVisibility, toggleColumn } = useColumnVisibility(
    CLIENTS_COLUMNS_STORAGE_KEY,
    DEFAULT_CLIENTS_COLUMN_VISIBILITY
  )

  const handleSave = async () => {
    setSaveError(null)
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      setSaveError('Le prénom et le nom sont requis.')
      return
    }
    const url = crud.editingItem?.clientName
      ? `/api/clients/${encodeURIComponent(crud.editingItem.clientName)}`
      : '/api/clients'
    const method = crud.editingItem ? 'PUT' : 'POST'
    const previousClients = [...clients]

    if (crud.editingItem) {
      const optimistic = clients.map(c =>
        c.clientName === crud.editingItem!.clientName
          ? { ...c, ...formData, clientName: `${formData.firstName} ${formData.lastName}`.trim() }
          : c
      )
      mutate(optimistic, { revalidate: false })
    } else {
      const newClientName = `${formData.firstName} ${formData.lastName}`.trim()
      mutate(
        [...clients, { ...formData, clientName: newClientName } as Client],
        { revalidate: false }
      )
    }

    try {
      const response = await electronFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const updatedClient = data as Client | undefined
        if (updatedClient) {
          if (crud.editingItem) {
            const next = clients.map((c) =>
              c.clientName === crud.editingItem!.clientName ? { ...updatedClient, clientName: updatedClient.clientName ?? `${updatedClient.firstName} ${updatedClient.lastName}`.trim() } : c
            )
            mutate(next, { revalidate: false })
          } else {
            const clientName = `${updatedClient.firstName} ${updatedClient.lastName}`.trim()
            mutate([...clients, { ...updatedClient, clientName: updatedClient.clientName ?? clientName }], { revalidate: false })
          }
        } else {
          await mutate()
        }
        crud.closeDialog()
        setFormData({})
        setSaveError(null)
        toast.success('Clients', { description: crud.editingItem ? 'Client mis à jour.' : 'Client créé.' })
      } else {
        mutate(previousClients, { revalidate: false })
        const detailsStr = typeof data?.details === 'string'
          ? data.details
          : Array.isArray(data?.details)
            ? data.details.map((d: { message?: string }) => d.message).filter(Boolean).join(', ')
            : ''
        const msg = data?.error || detailsStr || `Erreur ${response.status}`
        setSaveError(msg)
        toast.error('Clients', { description: msg })
      }
    } catch (error) {
      mutate(previousClients, { revalidate: false })
      setSaveError('Erreur réseau ou serveur. Réessayez.')
      handleApiError(error, 'Sauvegarde client')
    }
  }

  const handleConfirmDelete = async () => {
    if (!crud.itemToDelete) return
    crud.setIsDeleting(true)

    const clientId = crud.itemToDelete.clientName ?? [crud.itemToDelete.firstName, crud.itemToDelete.lastName].filter(Boolean).join(' ') ?? ''
    const previousClients = [...clients]

    // Optimistic UI update
    mutate(clients.filter(c => c.clientName !== crud.itemToDelete!.clientName), { revalidate: false })

    try {
      const response = await electronFetch(`/api/clients/${encodeURIComponent(clientId)}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        await mutate()
        toast.success('Clients', { description: 'Client supprimé.' })
      } else {
        const data = await response.json().catch(() => ({}))
        mutate(previousClients, { revalidate: false })
        toast.error('Clients', { description: data?.error || 'Erreur lors de la suppression' })
      }
    } catch (error) {
      mutate(previousClients, { revalidate: false })
      handleApiError(error, 'Suppression client')
    } finally {
      crud.closeDeleteDialog()
    }
  }

  const handleExport = () => {
    const csvContent = generateCSV(clients, ['firstName', 'lastName', 'clientName', 'email', 'phone', 'website', 'company'])
    downloadCSV(csvContent, `clients-${new Date().toISOString().split('T')[0]}.csv`)
  }

  const columns: Column<Client>[] = useMemo(
    () => [
      {
        key: 'clientName',
        label: 'Contact',
        sortable: true,
        sortLabel: 'alpha',
        render: (_, row) => {
          const displayName = [row.firstName, row.lastName].filter(Boolean).join(' ') || row.clientName || '—'
          const initials = getInitials(row.firstName, row.lastName) || (row.clientName?.slice(0, 2).toUpperCase() ?? '')
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                <AvatarImage src={undefined} alt={displayName} />
                <AvatarFallback className="rounded-lg text-xs">{initials || '?'}</AvatarFallback>
              </Avatar>
              <span className="truncate">{displayName}</span>
            </div>
          )
        },
      },
      { key: 'company', label: 'Entreprise', sortable: true, sortLabel: 'alpha', render: (v) => (v ? String(v) : <span className="text-foreground/70">Non renseigné</span>) },
      { key: 'lastName', label: 'Nom', sortable: true, sortLabel: 'alpha' },
      { key: 'firstName', label: 'Prénom', sortable: true, sortLabel: 'alpha' },
      {
        key: 'email',
        label: 'Email',
        sortable: true,
        sortLabel: 'alpha',
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
        sortable: true,
        sortLabel: 'alpha',
        render: (value) => value ? (
          <a href={`tel:${String(value)}`} className="text-blue-600 hover:underline">
            {String(value)}
          </a>
        ) : (
          <span className="text-foreground/70">Non renseigné</span>
        ),
      },
      {
        key: 'website',
        label: 'Site web',
        sortable: true,
        sortLabel: 'alpha',
        render: (value) => value ? (
          <a href={String(value).startsWith('http') ? String(value) : `https://${String(value)}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {String(value)}
          </a>
        ) : (
          <span className="text-foreground/70">Non renseigné</span>
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

  const renderMobileItem = (client: Client) => {
    const displayName = [client.firstName, client.lastName].filter(Boolean).join(' ') || client.clientName || '—'
    const initials = getInitials(client.firstName, client.lastName) || (client.clientName?.slice(0, 2).toUpperCase() ?? '')

    return (
      <Card className="group relative overflow-hidden transition-all hover:ring-1 hover:ring-primary/20 border-primary/5 bg-gradient-to-b from-background/80 to-muted/20">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
        <CardContent className="p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-12 w-12 shrink-0 rounded-xl border-2 border-background shadow-sm">
                <AvatarImage src={undefined} alt={displayName} />
                <AvatarFallback className="rounded-xl text-base font-bold bg-primary/10 text-primary">
                  {initials || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-bold text-base truncate leading-tight">{displayName}</div>
                {client.company ? (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3" />
                    <span className="truncate">{client.company}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground/60 italic mt-0.5">Particulier</div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => crud.handleEdit(client)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => crud.handleDeleteClick(client)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 p-2.5 rounded-lg bg-background/40 border border-primary/5 text-xs">
            <div className="flex items-center justify-between gap-2 overflow-hidden px-1">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Email</span>
              {client.email ? (
                <a href={`mailto:${client.email}`} className="text-primary font-medium truncate hover:underline">
                  {client.email}
                </a>
              ) : <span className="text-muted-foreground/40 italic">Non renseigné</span>}
            </div>
            <div className="flex items-center justify-between gap-2 overflow-hidden px-1">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Mobile</span>
              {client.phone ? (
                <a href={`tel:${client.phone}`} className="text-primary font-medium truncate hover:underline">
                  {client.phone}
                </a>
              ) : <span className="text-muted-foreground/40 italic">Non renseigné</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading && clients.length === 0) {
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
      <div className="w-full min-w-0 py-4 sm:py-6 space-y-4">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Erreur lors du chargement des clients</p>
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
            💡 <strong>Astuce :</strong> Utilisez les boutons d&apos;actions (✏️ Modifier, 🗑️ Supprimer) dans la colonne de droite pour gérer vos clients.
          </p>
        </div>
      </Card>

      <DataTable
        data={clients}
        columns={visibleColumns}
        toolbarExtra={columnsPopover}
        onAdd={crud.handleAdd}
        onEdit={crud.handleEdit}
        onDelete={crud.handleDeleteClick}
        onExport={handleExport}
        searchPlaceholder="Rechercher un client..."
        emptyMessage="Aucun client. Créez votre premier client."
        virtualized
        renderMobileItem={renderMobileItem}
      />

      {/* Add/Edit Client Dialog */}
      <ResponsiveDialog
        open={crud.isDialogOpen}
        onOpenChange={crud.setIsDialogOpen}
        title={crud.editingItem ? 'Modifier le client' : 'Nouveau client'}
        className="sm:max-w-2xl"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Colonne Gauche : Identité */}
            <div className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-lg border space-y-4 h-full">
                <h3 className="font-medium text-sm flex items-center gap-2 text-foreground/80">
                  <User className="size-4" /> Identité
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="Prénom"
                      autoFocus
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Nom"
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemple.com"
                    className="bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Colonne Droite : Coordonnées */}
            <div className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-lg border space-y-4 h-full">
                <h3 className="font-medium text-sm flex items-center gap-2 text-foreground/80">
                  <Building2 className="size-4" /> Coordonnées
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="company">Entreprise</Label>
                  <Input
                    id="company"
                    value={formData.company || ''}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Nom de l'entreprise"
                    className="bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="06 12 34 56 78"
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Site web</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://..."
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {saveError && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {saveError}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={() => { crud.closeDialog(); setSaveError(null) }}>
              Annuler
            </Button>
            <Button type="submit">
              {crud.editingItem ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </ResponsiveDialog>

      <ConfirmDialog
        isOpen={crud.isDeleteDialogOpen}
        onOpenChange={crud.setIsDeleteDialogOpen}
        title="Supprimer le client"
        description={`Êtes-vous sûr de vouloir supprimer le client "${[crud.itemToDelete?.firstName, crud.itemToDelete?.lastName].filter(Boolean).join(' ') || crud.itemToDelete?.clientName || ''}" ? Cette action est irréversible.`}
        onConfirm={handleConfirmDelete}
        isLoading={crud.isDeleting}
      />
    </div>
  )
}
