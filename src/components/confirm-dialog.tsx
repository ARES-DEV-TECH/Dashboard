'use client'

import * as React from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void | Promise<void>
    variant?: 'default' | 'destructive'
    isLoading?: boolean
}

export function ConfirmDialog({
    isOpen,
    onOpenChange,
    title,
    description,
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    onConfirm,
    variant = 'destructive',
    isLoading = false,
}: ConfirmDialogProps) {
    const handleConfirm = async () => {
        await onConfirm()
        onOpenChange(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] overflow-hidden p-0 gap-0 border-none shadow-2xl">
                <div className="relative h-32 w-full bg-gradient-to-br from-destructive/10 to-destructive/5 flex items-center justify-center">
                    <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center animate-pulse">
                        <AlertTriangle className="size-8 text-destructive" />
                    </div>
                </div>

                <div className="p-6 space-y-4 text-center">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-foreground">
                            {title}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground pt-2">
                            {description}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="flex-1 font-semibold transition-all active:scale-95"
                        >
                            {cancelText}
                        </Button>
                        <Button
                            type="button"
                            variant={variant === 'destructive' ? 'destructive' : 'default'}
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className="flex-1 font-bold shadow-lg shadow-destructive/20 transition-all active:scale-95"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <span className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                    Traitement...
                                </span>
                            ) : (
                                confirmText
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}
