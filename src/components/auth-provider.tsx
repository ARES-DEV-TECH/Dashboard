'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  company?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  /** Retourne true si connecté, false si échec, 'email_not_verified' si compte non validé. */
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean | 'email_not_verified'>
  register: (email: string, password: string, firstName: string, lastName: string, company?: string) => Promise<boolean>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' })
        if (cancelled) return
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch {
        if (!cancelled) { /* non connecté ou erreur */ }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  const login = async (email: string, password: string, rememberMe = true): Promise<boolean | 'email_not_verified'> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        return true
      }
      if (response.status === 403) return 'email_not_verified'
      return false
    } catch (error) {
      console.error('Erreur de connexion:', error)
      return false
    }
  }

  const register = async (email: string, password: string, firstName: string, lastName: string, company?: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, firstName, lastName, company }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        return true
      }
      return false
    } catch (error) {
      console.error('Erreur d\'inscription:', error)
      return false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Erreur de déconnexion:', error)
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
