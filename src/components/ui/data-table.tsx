'use client'

/**
 * Composant liste réutilisable – table avec recherche, tri, pagination, virtualisation.
 * Utilisé pour Clients, Articles, Charges (et éventuellement Ventes).
 *
 * Pattern d’usage : SWR pour les données + DataTable pour l’affichage + Dialog/Modal pour créer/éditer.
 * Voir docs/COMPOSANT-LISTE.md pour le guide d’utilisation.
 */
import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Search, Download, Upload, Plus, Edit, Trash2, FileText, Receipt, ArrowUp, ArrowDown, ArrowUpDown, Inbox } from 'lucide-react'
import { formatTableDate } from '@/lib/utils'
import { useState, useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'

const ROW_HEIGHT = 48
const VIRTUALIZE_THRESHOLD = 200
const VIRTUAL_LIST_HEIGHT = 400

export interface Column<T> {
  key: keyof T
  label: string
  render?: (value: unknown, row: T) => React.ReactNode
  sortable?: boolean
  /** 'alpha' = A-Z / Z-A, 'numeric' = Croissant / Décroissant (défaut pour dates et nombres). */
  sortLabel?: 'alpha' | 'numeric'
  className?: string
}

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[]
  columns: Column<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  pagination?: boolean
  pageSize?: number
  onExport?: () => void
  onImport?: () => void
  onAdd?: () => void
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  onGenerateQuote?: (row: T) => void
  onGenerateInvoice?: (row: T) => void
  /** Message affiché quand la liste est vide (avec CTA Créer si onAdd fourni). */
  emptyMessage?: string
  /** Active la virtualisation pour les listes > ~200 lignes (scroll fluide). */
  virtualized?: boolean
  /** Tri initial (ex. { field: 'saleDate', direction: 'desc' }). */
  defaultSort?: { field: keyof T; direction: 'asc' | 'desc' }
  /** Contenu additionnel dans la barre d’outils (ex. sélecteur de colonnes). */
  toolbarExtra?: React.ReactNode
  /** Rendu personnalisé pour la vue mobile (cartes). Si non fourni, affiche le tableau classique (avec scroll). */
  renderMobileItem?: (row: T) => React.ReactNode
  className?: string
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = 'Rechercher...',
  pagination = true,
  pageSize = 10,
  onExport,
  onImport,
  onAdd,
  onEdit,
  onDelete,
  onGenerateQuote,
  onGenerateInvoice,
  emptyMessage,
  virtualized = false,
  defaultSort,
  toolbarExtra,
  renderMobileItem,
  className
}: DataTableProps<T>) {
  const isMobile = useIsMobile()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<keyof T | null>(defaultSort?.field ?? null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSort?.direction ?? 'asc')
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const filteredData = useMemo(() => {
    if (!data?.length) return []
    if (!searchTerm) return data
    return data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [data, searchTerm])

  const sortedData = useMemo(() => {
    if (!filteredData.length) return []
    if (!sortField) return filteredData
    const dir = sortDirection === 'asc' ? 1 : -1
    return [...filteredData].sort((a, b) => {
      let aVal: unknown = a[sortField]
      let bVal: unknown = b[sortField]
      const aEmpty = aVal == null || aVal === ''
      const bEmpty = bVal == null || bVal === ''
      if (aEmpty && bEmpty) return 0
      if (aEmpty) return dir
      if (bEmpty) return -dir
      if (aVal instanceof Date && bVal instanceof Date) {
        const cmp = Math.sign(aVal.getTime() - bVal.getTime())
        return cmp * dir
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        const cmp = Math.sign(aVal - bVal)
        return cmp * dir
      }
      const aStr = typeof aVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(aVal)
        ? new Date(aVal).getTime()
        : String(aVal).toLowerCase()
      const bStr = typeof bVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(bVal)
        ? new Date(bVal).getTime()
        : String(bVal).toLowerCase()
      if (typeof aStr === 'number' && typeof bStr === 'number') {
        const cmp = Math.sign(aStr - bStr)
        return cmp * dir
      }
      if (aStr < bStr) return -dir
      if (aStr > bStr) return dir
      return 0
    })
  }, [filteredData, sortField, sortDirection])

  // En mode virtualisé (> 200 lignes) : on affiche toute la liste avec scroll virtuel. Sinon : pagination classique.
  const useVirtual = virtualized && sortedData.length > VIRTUALIZE_THRESHOLD
  const paginatedData = useMemo(() => {
    if (useVirtual) return sortedData
    if (!pagination) return sortedData
    if (!sortedData.length) return []
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, currentPage, pageSize, pagination, useVirtual])

  const totalPages = Math.ceil((sortedData.length || 0) / pageSize)

  const rowVirtualizer = useVirtualizer({
    count: useVirtual ? sortedData.length : 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })
  const virtualItems = rowVirtualizer.getVirtualItems()
  const virtualData = useVirtual ? sortedData : []

  const handleSort = (field: keyof T) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const formatValue = (value: unknown, column: Column<T>, row: T) => {
    if (column.render) {
      return column.render(value, row)
    }

    // Format currency
    if (typeof value === 'number' && (column.label.toLowerCase().includes('prix') ||
      column.label.toLowerCase().includes('montant') ||
      column.label.toLowerCase().includes('ca') ||
      column.label.toLowerCase().includes('total'))) {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
      }).format(value)
    }

    // Format date (ex. 2026-avr-01)
    if (value instanceof Date) {
      return formatTableDate(value)
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return formatTableDate(value)
    }

    return String(value)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:w-auto min-w-0">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-foreground/50 pointer-events-none" aria-hidden />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-64 min-w-0"
                aria-label="Rechercher"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {toolbarExtra}
          {onImport && (
            <Button variant="outline" size="sm" onClick={onImport}>
              <Upload className="h-4 w-4 mr-2" />
              Importer
            </Button>
          )}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          )}
          {onAdd && (
            <Button size="sm" onClick={onAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau
            </Button>
          )}
        </div>
      </div>

      {/* Vue Mobile (Cartes) ou Desktop (Tableau) */}
      {isMobile && renderMobileItem ? (
        <div className="space-y-4">
          {paginatedData.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 animate-fade-in text-center">
              <div className="rounded-full bg-muted/50 p-4">
                <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
              </div>
              <p className="text-muted-foreground text-sm">{emptyMessage ?? 'Aucune donnée'}</p>
              {onAdd && (
                <Button size="sm" onClick={onAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer
                </Button>
              )}
            </div>
          ) : (
            paginatedData.map((row, index) => (
              <div key={index} className="animate-fade-in">
                {renderMobileItem(row)}
              </div>
            ))
          )}
        </div>
      ) : (
        /* Table : scroll horizontal sur mobile/tablette ; virtualisation si virtualized et > 200 lignes */
        <div
          className="rounded-md border overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0"
          ref={useVirtual ? scrollContainerRef : undefined}
          style={useVirtual ? { maxHeight: VIRTUAL_LIST_HEIGHT, overflow: 'auto' } : undefined}
        >
          <Table className="min-w-[600px]">
            <TableHeader>
              <TableRow>
                {columns.map((column) => {
                  const isAlpha = column.sortLabel === 'alpha'
                  const sortHint = sortField === column.key
                    ? isAlpha
                      ? (sortDirection === 'asc' ? 'A-Z' : 'Z-A')
                      : (sortDirection === 'asc' ? 'Croissant' : 'Décroissant')
                    : isAlpha
                      ? 'Cliquer : A-Z / Z-A'
                      : 'Cliquer : Croissant / Décroissant'
                  return (
                    <TableHead
                      key={String(column.key)}
                      className={`${column.className || ''} ${column.sortable ? 'cursor-pointer hover:bg-muted/50 select-none' : ''
                        }`}
                      onClick={() => column.sortable && handleSort(column.key)}
                      title={column.sortable ? sortHint : undefined}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{column.label}</span>
                        {column.sortable && (
                          <span className="inline-flex items-center gap-1 text-muted-foreground text-xs" aria-label={sortHint}>
                            {sortField === column.key ? (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-4 w-4 shrink-0" />
                              ) : (
                                <ArrowDown className="h-4 w-4 shrink-0" />
                              )
                            ) : (
                              <ArrowUpDown className="h-4 w-4 shrink-0 opacity-60" />
                            )}
                            {sortField === column.key && (
                              <span className="hidden sm:inline font-normal">
                                {isAlpha ? (sortDirection === 'asc' ? 'A-Z' : 'Z-A') : (sortDirection === 'asc' ? 'Croissant' : 'Décroissant')}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  )
                })}
                {(onEdit || onDelete || onGenerateQuote || onGenerateInvoice) && (
                  <TableHead className="w-40 text-center">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody
              style={useVirtual ? { position: 'relative', height: `${rowVirtualizer.getTotalSize()}px` } : undefined}
            >
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (onEdit || onDelete || onGenerateQuote || onGenerateInvoice ? 1 : 0)} className="text-center py-12">
                    <div className="flex flex-col items-center gap-4 animate-fade-in">
                      <div className="rounded-full bg-muted/50 p-4">
                        <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
                      </div>
                      <p className="text-muted-foreground text-sm">{emptyMessage ?? 'Aucune donnée'}</p>
                      {onAdd && (
                        <Button size="sm" onClick={onAdd}>
                          <Plus className="h-4 w-4 mr-2" />
                          Créer
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : useVirtual ? (
                <>
                  <TableRow aria-hidden style={{ height: rowVirtualizer.getTotalSize(), visibility: 'hidden' }}>
                    <TableCell colSpan={columns.length + (onEdit || onDelete || onGenerateQuote || onGenerateInvoice ? 1 : 0)} />
                  </TableRow>
                  {virtualItems.map((virtualRow) => {
                    const row = virtualData[virtualRow.index]
                    return (
                      <TableRow
                        key={virtualRow.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {columns.map((column) => (
                          <TableCell key={String(column.key)} className={column.className}>
                            {formatValue(row[column.key], column, row)}
                          </TableCell>
                        ))}
                        {(onEdit || onDelete || onGenerateQuote || onGenerateInvoice) && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {onGenerateQuote && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onGenerateQuote(row)}
                                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                    >
                                      <FileText className="h-4 w-4" />
                                      <span className="sr-only">Générer Devis</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Générer Devis</TooltipContent>
                                </Tooltip>
                              )}
                              {onGenerateInvoice && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onGenerateInvoice(row)}
                                      className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-500/10"
                                    >
                                      <Receipt className="h-4 w-4" />
                                      <span className="sr-only">Générer Facture</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Générer Facture</TooltipContent>
                                </Tooltip>
                              )}
                              {onEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onEdit(row)}
                                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                    >
                                      <Edit className="h-4 w-4" />
                                      <span className="sr-only">Modifier</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Modifier</TooltipContent>
                                </Tooltip>
                              )}
                              {onDelete && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => onDelete(row)}
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Supprimer</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Supprimer</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </>
              ) : (
                paginatedData.map((row, index) => (
                  <TableRow
                    key={index}
                    className=""
                  >
                    {columns.map((column) => (
                      <TableCell key={String(column.key)} className={column.className}>
                        {formatValue(row[column.key], column, row)}
                      </TableCell>
                    ))}
                    {(onEdit || onDelete || onGenerateQuote || onGenerateInvoice) && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {onGenerateQuote && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onGenerateQuote(row)}
                                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                >
                                  <FileText className="h-4 w-4" />
                                  <span className="sr-only">Générer Devis</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Générer Devis</TooltipContent>
                            </Tooltip>
                          )}
                          {onGenerateInvoice && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onGenerateInvoice(row)}
                                  className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-500/10"
                                >
                                  <Receipt className="h-4 w-4" />
                                  <span className="sr-only">Générer Facture</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Générer Facture</TooltipContent>
                            </Tooltip>
                          )}
                          {onEdit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onEdit(row)}
                                  className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                >
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Modifier</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Modifier</TooltipContent>
                            </Tooltip>
                          )}
                          {onDelete && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => onDelete(row)}
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Supprimer</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Supprimer</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )
      }

      {/* Pagination (masquée en mode virtualisé : tout est dans le scroll) */}
      {
        useVirtual && sortedData.length > 0 && (
          <div className="text-sm text-foreground/70">
            {sortedData.length} ligne{sortedData.length > 1 ? 's' : ''} — défilez pour parcourir la liste
          </div>
        )
      }
      {
        !useVirtual && pagination && totalPages > 1 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-foreground/70 order-2 sm:order-1">
              {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, sortedData.length)} / {sortedData.length}
            </div>
            <div className="flex items-center justify-center gap-2 order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Page précédente"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </Button>
              <div className="flex items-center space-x-1">
                {(() => {
                  const maxButtons = Math.min(5, totalPages)
                  const start = Math.max(1, Math.min(currentPage - Math.floor(maxButtons / 2), totalPages - maxButtons + 1))
                  return Array.from({ length: maxButtons }, (_, i) => {
                    const page = start + i
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        aria-label={`Page ${page}`}
                      >
                        {page}
                      </Button>
                    )
                  })
                })()}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Page suivante"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        )
      }
    </div>
  )
}
