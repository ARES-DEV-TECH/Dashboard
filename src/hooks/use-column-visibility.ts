/**
 * Reusable hook for managing column visibility in DataTable
 * 
 * Usage:
 * const { columnVisibility, toggleColumn, saveColumnVisibility } = useColumnVisibility(
 *   'clients-table-columns',
 *   DEFAULT_COLUMN_VISIBILITY
 * )
 */

import { useState, useCallback } from 'react'

export function useColumnVisibility(
    storageKey: string,
    defaultVisibility: Record<string, boolean>
) {
    const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
        if (typeof window === 'undefined') return { ...defaultVisibility }

        try {
            const stored = window.localStorage.getItem(storageKey)
            if (!stored) return { ...defaultVisibility }

            const parsed = JSON.parse(stored) as Record<string, boolean>
            return { ...defaultVisibility, ...parsed }
        } catch {
            return { ...defaultVisibility }
        }
    })

    const saveColumnVisibility = useCallback((next: Record<string, boolean>) => {
        setColumnVisibility(next)
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(next))
        } catch {
            // Ignore localStorage errors
        }
    }, [storageKey])

    const toggleColumn = useCallback((key: string) => {
        const visibleCount = Object.values(columnVisibility).filter(Boolean).length
        const currentlyVisible = columnVisibility[key] !== false

        // Prevent hiding the last visible column
        if (currentlyVisible && visibleCount <= 1) return

        saveColumnVisibility({ ...columnVisibility, [key]: !currentlyVisible })
    }, [columnVisibility, saveColumnVisibility])

    return {
        columnVisibility,
        setColumnVisibility: saveColumnVisibility,
        toggleColumn,
    }
}
