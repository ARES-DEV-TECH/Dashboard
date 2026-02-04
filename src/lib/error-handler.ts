/**
 * Centralized error handling utility
 * 
 * Usage:
 * try {
 *   await saveData()
 * } catch (error) {
 *   handleApiError(error, 'Sauvegarde client')
 * }
 */

import { toast } from 'sonner'
import * as Sentry from '@sentry/nextjs'

export interface ErrorContext {
    context: string
    userId?: string
    metadata?: Record<string, unknown>
}

/**
 * Handle API errors with consistent logging and user feedback
 */
export function handleApiError(
    error: unknown,
    context: string,
    options?: {
        silent?: boolean
        metadata?: Record<string, unknown>
    }
): void {
    const errorMessage = getErrorMessage(error)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
        console.error(`[${context}]`, error)
    }

    // Send to Sentry in production
    if (process.env.NODE_ENV === 'production') {
        Sentry.captureException(error, {
            tags: { context },
            extra: options?.metadata,
        })
    }

    // Show toast to user unless silent
    if (!options?.silent) {
        toast.error(context, { description: errorMessage })
    }
}

/**
 * Extract a user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === 'string') {
        return error
    }

    if (error && typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string') {
            return error.message
        }
        if ('error' in error && typeof error.error === 'string') {
            return error.error
        }
    }

    return 'Une erreur est survenue'
}

/**
 * Handle network errors specifically
 */
export function handleNetworkError(context: string): void {
    console.error(`[${context}] Network error`)
    toast.error(context, {
        description: 'Erreur réseau. Vérifiez votre connexion.',
    })
}

/**
 * Handle validation errors
 */
export function handleValidationError(
    context: string,
    errors: Record<string, string[]>
): void {
    const firstError = Object.values(errors)[0]?.[0]
    toast.error(context, {
        description: firstError || 'Erreur de validation',
    })
}

/**
 * Safe error message extractor (backward compatibility)
 */
export function safeErrorMessage(error: unknown, fallback: string): string {
    return getErrorMessage(error) || fallback
}
