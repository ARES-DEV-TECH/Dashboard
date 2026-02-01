'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      const msg = 'Lien invalide ou expiré.'
      setError(msg)
      toast.error('Réinitialisation', { description: msg })
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!token) return
    if (password.length < 6) {
      const msg = 'Le mot de passe doit contenir au moins 6 caractères.'
      setError(msg)
      toast.error('Réinitialisation', { description: msg })
      return
    }
    if (password !== confirmPassword) {
      const msg = 'Les mots de passe ne correspondent pas.'
      setError(msg)
      toast.error('Réinitialisation', { description: msg })
      return
    }
    setLoading(true)
    try {
      const res = await electronFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSuccess(true)
        toast.success('Réinitialisation', { description: 'Mot de passe mis à jour. Redirection...' })
        setTimeout(() => router.push('/login'), 2000)
      } else {
        const msg = data.error || 'Lien invalide ou expiré.'
        setError(msg)
        toast.error('Réinitialisation', { description: msg })
      }
    } catch {
      const msg = 'Une erreur est survenue.'
      setError(msg)
      toast.error('Réinitialisation', { description: msg })
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="auth-page min-h-dvh min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md bg-card border border-border shadow-xl">
          <CardContent className="pt-6">
            <p className="text-destructive text-center">Lien invalide ou expiré.</p>
            <div className="text-center mt-4">
              <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                Demander un nouveau lien
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="auth-page min-h-dvh min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background">
      <Card className="w-full max-w-md bg-card border border-border shadow-xl">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto flex justify-center">
            <Logo size={56} />
          </div>
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold mb-2 text-foreground">
              Nouveau mot de passe
            </CardTitle>
            <CardDescription className="text-foreground/80">
              Choisissez un mot de passe d&apos;au moins 6 caractères.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <div className="rounded-lg p-4 bg-primary/10 border border-primary/20 text-foreground text-center">
              <p className="font-medium">Mot de passe mis à jour</p>
              <p className="text-sm text-foreground/80 mt-1">Redirection vers la connexion...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-medium text-foreground">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-4 pr-12 py-3 rounded-lg"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/70 hover:opacity-80"
                    aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-medium text-foreground">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-4 py-3 rounded-lg"
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <div className="rounded-lg p-3 text-sm text-center bg-destructive/10 border border-destructive/30 text-destructive">
                  {error}
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  'Réinitialiser le mot de passe'
                )}
              </Button>
            </form>
          )}
          <div className="text-center">
            <Link href="/login" className="text-sm font-medium text-primary hover:underline">
              Retour à la connexion
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground/70">Chargement...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
