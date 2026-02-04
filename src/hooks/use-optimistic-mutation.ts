/**
 * Reusable hook for optimistic mutations with SWR
 * 
 * Usage:
 * const { performMutation } = useOptimisticMutation({
 *   mutate: mutateClients,
 *   data: clients,
 *   onSuccess: () => toast.success('Saved'),
 *   onError: (error) => toast.error(error.message)
 * })
 */

import { useCallback } from 'react'
import type { KeyedMutator } from 'swr'

interface UseOptimisticMutationOptions<T> {
    mutate: KeyedMutator<T>
    data: T
    onSuccess?: (result: unknown) => void
    onError?: (error: unknown) => void
}

export function useOptimisticMutation<T>({
    mutate,
    data,
    onSuccess,
    onError,
}: UseOptimisticMutationOptions<T>) {

    const performMutation = useCallback(
        async (
            optimisticData: T,
            apiCall: () => Promise<Response>,
            options?: {
                revalidate?: boolean
            }
        ) => {
            const previousData = data

            // Optimistic update
            mutate(optimisticData, { revalidate: false })

            try {
                const response = await apiCall()
                const result = await response.json().catch(() => null)

                if (response.ok) {
                    // Success - revalidate if needed
                    if (options?.revalidate !== false) {
                        await mutate()
                    }
                    onSuccess?.(result)
                    return { success: true, data: result }
                } else {
                    // Rollback on error
                    mutate(previousData, { revalidate: false })
                    onError?.(result)
                    return { success: false, error: result }
                }
            } catch (error) {
                // Rollback on exception
                mutate(previousData, { revalidate: false })
                onError?.(error)
                return { success: false, error }
            }
        },
        [mutate, data, onSuccess, onError]
    )

    return { performMutation }
}
