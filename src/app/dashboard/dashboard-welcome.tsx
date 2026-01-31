'use client'

import { useAuth } from '@/components/auth-provider'

export function DashboardWelcome() {
  const { user } = useAuth()
  const parts = [user?.firstName, user?.lastName].filter(Boolean)
  const name = parts.length ? parts.join(' ') : user?.email?.split('@')[0] || ''
  if (!name) return null
  return (
    <p className="text-muted-foreground text-base mt-1">
      {name}
    </p>
  )
}
