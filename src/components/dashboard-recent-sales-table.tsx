'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, ChevronDown, MoreHorizontal, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { SWR_KEYS } from '@/lib/swr-fetchers'
import { formatTableDate, cn } from '@/lib/utils'

export type RecentSale = {
  id: string
  client: string
  service: string
  amount: number
  status: string
  date: string
  frequency: string
  items?: any[]
}

const updateStatus = async (invoiceNo: string, newStatus: string) => {
  type SalesCache = { sales?: { invoiceNo: string; status?: string;[k: string]: unknown }[]; pagination?: unknown } | undefined
  let previousSales: SalesCache
  let previousSalesList: SalesCache

  // Mise à jour optimiste immédiate (UI réactive avant la réponse API)
  mutate(
    SWR_KEYS.sales,
    (current: SalesCache) => {
      previousSales = current
      if (!current?.sales) return current
      return {
        ...current,
        sales: current.sales.map((s) =>
          s.invoiceNo === invoiceNo ? { ...s, status: newStatus } : s
        ),
      }
    },
    { revalidate: false }
  )
  mutate(
    SWR_KEYS.salesList,
    (current: SalesCache) => {
      previousSalesList = current
      if (!current?.sales) return current
      return {
        ...current,
        sales: current.sales.map((s) =>
          s.invoiceNo === invoiceNo ? { ...s, status: newStatus } : s
        ),
      }
    },
    { revalidate: false }
  )

  try {
    const res = await electronFetch(`/api/sales/${encodeURIComponent(invoiceNo)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      toast.success('Statut mis à jour')
      mutate(SWR_KEYS.sales, undefined, { revalidate: true })
      mutate(SWR_KEYS.salesList, undefined, { revalidate: true })
      mutate((key) => typeof key === 'string' && key.startsWith('dashboard'), undefined, { revalidate: true })
    } else {
      mutate(SWR_KEYS.sales, previousSales!, { revalidate: false })
      mutate(SWR_KEYS.salesList, previousSalesList!, { revalidate: false })
      toast.error('Erreur lors de la mise à jour')
    }
  } catch (e) {
    console.error(e)
    mutate(SWR_KEYS.sales, previousSales!, { revalidate: false })
    mutate(SWR_KEYS.salesList, previousSalesList!, { revalidate: false })
    toast.error('Erreur réseau')
  }
}

const columns: ColumnDef<RecentSale>[] = [
  {
    accessorKey: 'id',
    header: 'N° Facture',
    cell: ({ row }) => <div className="font-medium">{row.getValue('id')}</div>,
  },
  {
    accessorKey: 'client',
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Client
        <ArrowUpDown className="ml-2 size-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{row.getValue('client')}</div>,
  },
  {
    accessorKey: 'service',
    header: 'Service',
    cell: ({ row }) => {
      const sale = row.original
      const items = sale.items || []

      if (items.length === 0) {
        return <div className="max-w-[200px] truncate">{sale.service ?? '—'}</div>
      }

      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="link" className="h-auto p-0 text-left font-normal text-foreground hover:text-primary transition-colors max-w-[200px] truncate block">
              {sale.service}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 overflow-hidden shadow-xl border-primary/20" align="start">
            <div className="bg-primary/5 px-3 py-2 border-b border-primary/10">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary/70 italic flex items-center gap-2">
                <Inbox className="size-3" /> Détails de la facturation
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
              {items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                  <div className="min-w-0">
                    <div className="text-xs font-bold leading-tight">{item.serviceName}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {item.unitLabel === 'heure' ? `${item.quantity} h × ${item.unitPriceHt}€` : `${item.quantity} × ${item.unitPriceHt}€`}
                    </div>
                  </div>
                  <div className="text-xs font-bold text-primary italic whitespace-nowrap">
                    {(item.quantity * (item.unitPriceHt + (item.optionsTotalHt || 0))).toFixed(2)}€
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-muted/30 p-2 border-t flex justify-between items-center px-4 py-2.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Total HT</span>
              <span className="text-sm font-black text-primary italic">
                {items.reduce((sum, item) => sum + (item.quantity * (item.unitPriceHt + (item.optionsTotalHt || 0))), 0).toFixed(2)} €
              </span>
            </div>
          </PopoverContent>
        </Popover>
      )
    },
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => <div>{formatTableDate(row.getValue('date') as string)}</div>,
  },
  {
    accessorKey: 'frequency',
    header: 'Fréquence',
    cell: ({ row }) => <div>{row.getValue('frequency') ?? 'Ponctuel'}</div>,
  },
  {
    accessorKey: 'status',
    header: 'Statut',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge
          variant={
            status === 'Payée'
              ? 'default'
              : status === 'En retard' || status === 'Annulée'
                ? 'destructive'
                : 'secondary'
          }
          className="gap-2"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
          </span>
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Montant</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'))
      return (
        <div className="text-right font-medium">
          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)}
        </div>
      )
    },
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) => {
      const sale = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Ouvrir le menu</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => updateStatus(sale.id, 'paid')}>
              Marquer comme Payée
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus(sale.id, 'pending')}>
              Marquer comme En attente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus(sale.id, 'cancelled')}>
              Marquer comme Annulée
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

import { useIsMobile } from '@/hooks/use-mobile'
import { Card, CardContent } from '@/components/ui/card'

export function DashboardRecentSalesTable({ data }: { data: RecentSale[] }) {
  const isMobile = useIsMobile()
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters },
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  })

  // Vue Mobile (Cartes)
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative w-full">
            <Input
              placeholder="Rechercher un client..."
              value={(table.getColumn('client')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('client')?.setFilterValue(e.target.value)}
              className="w-full bg-background/50 pl-9"
            />
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          </div>
        </div>

        {table.getRowModel().rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl border-muted">
            <Inbox className="h-10 w-10 opacity-20" />
            <p className="text-sm">Aucune vente trouvée.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {table.getRowModel().rows.map((row) => {
              const sale = row.original
              const statusVariant = sale.status === 'Payée'
                ? 'default'
                : sale.status === 'En retard' || sale.status === 'Annulée'
                  ? 'destructive'
                  : 'secondary'

              return (
                <Card
                  key={row.id}
                  className="group relative overflow-hidden transition-all hover:ring-1 hover:ring-primary/20 border-primary/5 bg-gradient-to-b from-background/80 to-muted/20"
                >
                  <div
                    className={cn(
                      "absolute top-0 left-0 w-1 h-full",
                      statusVariant === 'default' ? "bg-green-500" : statusVariant === 'destructive' ? "bg-red-500" : "bg-orange-500"
                    )}
                  />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-base truncate mb-0.5">{sale.client}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded uppercase tracking-tighter">#{sale.id}</span>
                          <span className="shrink-0">•</span>
                          <span className="whitespace-nowrap">{formatTableDate(sale.date)}</span>
                        </div>
                      </div>
                      <Badge
                        variant={statusVariant}
                        className={cn(
                          "shrink-0 font-semibold shadow-sm",
                          sale.status === 'Payée' && "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20"
                        )}
                      >
                        {sale.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-background/40 border border-primary/5">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Service</div>
                        <div className="text-sm font-medium truncate">{sale.service || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5 text-right">Montant</div>
                        <div className="text-base font-bold text-primary italic">
                          {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(sale.amount)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <Badge variant="secondary" className="bg-muted text-[10px] uppercase font-bold tracking-widest px-2 py-0">
                        {sale.frequency || 'Ponctuel'}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors group">
                            Actions
                            <MoreHorizontal className="size-3 ml-2 group-hover:rotate-90 transition-transform" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Modifier statut</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => updateStatus(sale.id, 'paid')} className="cursor-pointer">
                            <div className="size-2 rounded-full bg-green-500 mr-2" />
                            Marquer Payée
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(sale.id, 'pending')} className="cursor-pointer">
                            <div className="size-2 rounded-full bg-orange-500 mr-2" />
                            Marquer En attente
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(sale.id, 'cancelled')} className="cursor-pointer">
                            <div className="size-2 rounded-full bg-red-500 mr-2" />
                            Marquer Annulée
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-muted/30">
          <div className="text-xs text-muted-foreground italic">
            Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 font-bold"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 font-bold"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Suivant
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Vue Desktop (Tableau)
  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filtrer par client..."
          value={(table.getColumn('client')?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn('client')?.setFilterValue(e.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Colonnes <ChevronDown className="ml-2 size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  className="capitalize"
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                >
                  {col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
                    <span className="text-sm text-muted-foreground">Aucun résultat.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Suivant
        </Button>
      </div>
    </div>
  )
}
