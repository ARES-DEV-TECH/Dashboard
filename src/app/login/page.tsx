'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/auth-provider'
import { warmupApis, preloadSwrCache } from '@/lib/warmup-apis'
import { useSWRConfig } from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user) {
      router.prefetch('/dashboard')
      router.prefetch('/clients')
      router.prefetch('/articles')
      router.prefetch('/sales')
      router.prefetch('/charges')
      router.prefetch('/settings')
      warmupApis()
      preloadSwrCache(mutate)
      router.replace('/dashboard')
    }
  }, [authLoading, user, router, mutate])

  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'invalid_credentials') {
      const msg = 'Email ou mot de passe incorrect'
      setError(msg)
      toast.error('Connexion', { description: msg })
    }
  }, [searchParams])

  const { login: doLogin } = useAuth()

  const prefetchAppRoutes = () => {
    router.prefetch('/dashboard')
    router.prefetch('/clients')
    router.prefetch('/articles')
    router.prefetch('/sales')
    router.prefetch('/charges')
    router.prefetch('/settings')
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const ok = await doLogin(email.trim(), password, rememberMe)
      if (ok) {
        prefetchAppRoutes()
        warmupApis()
        preloadSwrCache(mutate)
        router.replace('/dashboard')
        return
      }
      const msg = 'Email ou mot de passe incorrect'
      setError(msg)
      toast.error('Connexion', { description: msg })
    } catch {
      const msg = 'Erreur de connexion'
      setError(msg)
      toast.error('Connexion', { description: msg })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <div className="auth-page min-h-dvh min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background">
      <Card className="w-full max-w-md bg-card border border-border shadow-xl">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto flex justify-center">
            <Logo size={56} />
          </div>
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold mb-2 text-foreground">Connexion</CardTitle>
            <CardDescription className="text-muted-foreground">
              Connectez-vous à votre tableau de bord
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form id="login-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-4 pr-4 py-3 rounded-lg"
                  placeholder="votre@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="font-medium text-foreground">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-4 pr-12 py-3 rounded-lg"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/70 hover:opacity-80"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="rememberMe" className="text-sm cursor-pointer select-none text-foreground/80">
                    Se souvenir de moi
                  </Label>
                </div>
                <a href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>
            </div>
            {error && (
              <div className="rounded-lg p-3 text-sm text-center bg-destructive/10 border border-destructive/30 text-destructive">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
          <div className="text-center">
            <p className="text-sm text-foreground/80">
              Pas encore de compte ?{' '}
              <a href="/register" className="font-medium text-primary hover:underline">
                S&apos;inscrire
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-foreground/70">Chargement...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
