/**
 * Reusable hook for CRUD list operations
 * 
 * This hook encapsulates common patterns for list-based CRUD operations:
 * - Dialog state management
 * - Edit/Delete item tracking
 * - Form state
 * 
 * Usage:
 * const crud = useCrudList<Client>({
 *   onAdd: () => setFormData({}),
 *   onEdit: (client) => setFormData(client),
 * })
 */

import { useState, useCallback, useEffect } from 'react'

interface UseCrudListOptions<T> {
    onAdd?: () => void
    onEdit?: (item: T) => void
    onDelete?: (item: T) => void
}

export function useCrudList<T>(options?: UseCrudListOptions<T>) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<T | null>(null)
    const [itemToDelete, setItemToDelete] = useState<T | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleAdd = useCallback(() => {
        setEditingItem(null)
        setIsDialogOpen(true)
        options?.onAdd?.()
    }, [options])

    const handleEdit = useCallback((item: T) => {
        setEditingItem(item)
        setIsDialogOpen(true)
        options?.onEdit?.(item)
    }, [options])

    const handleDeleteClick = useCallback((item: T) => {
        setItemToDelete(item)
        setIsDeleteDialogOpen(true)
        options?.onDelete?.(item)
    }, [options])

    const closeDialog = useCallback(() => {
        setIsDialogOpen(false)
        setEditingItem(null)
    }, [])

    const closeDeleteDialog = useCallback(() => {
        setIsDeleteDialogOpen(false)
        setItemToDelete(null)
        setIsDeleting(false)
    }, [])

    // Keyboard shortcut for "New"
    useEffect(() => {
        const handler = () => handleAdd()
        window.addEventListener('shortcut-new', handler)
        return () => window.removeEventListener('shortcut-new', handler)
    }, [handleAdd])

    return {
        // Dialog state
        isDialogOpen,
        setIsDialogOpen,
        isDeleteDialogOpen,
        setIsDeleteDialogOpen,

        // Item state
        editingItem,
        setEditingItem,
        itemToDelete,
        setItemToDelete,
        isDeleting,
        setIsDeleting,

        // Handlers
        handleAdd,
        handleEdit,
        handleDeleteClick,
        closeDialog,
        closeDeleteDialog,
    }
}
