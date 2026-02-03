'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/auth-provider'
import { preloadSwrCache } from '@/lib/warmup-apis'
import { useSWRConfig } from 'swr'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [showResendConfirmation, setShowResendConfirmation] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user) {
      preloadSwrCache(mutate)
      router.replace('/dashboard')
    }
  }, [authLoading, user, router, mutate])

  // Prefetch dashboard pour que le JS soit prêt à la redirection post-login
  useEffect(() => {
    router.prefetch('/dashboard')
  }, [router])

  useEffect(() => {
    const err = searchParams.get('error')
    const verified = searchParams.get('verified')
    if (verified === '1') {
      toast.success('Connexion', { description: 'Compte activé. Vous pouvez vous connecter.' })
    }
    if (err === 'invalid_credentials') {
      const msg = 'Email ou mot de passe incorrect'
      setError(msg)
      toast.error('Connexion', { description: msg })
    }
    if (err === 'email_not_verified') {
      const msg = 'Validez votre email avant de vous connecter. Consultez le lien envoyé à votre adresse.'
      setError(msg)
      setShowResendConfirmation(true)
      toast.error('Connexion', { description: msg })
    }
  }, [searchParams])

  const { login: doLogin } = useAuth()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setShowResendConfirmation(false)
    setLoading(true)
    try {
      const result = await doLogin(email.trim(), password, rememberMe)
      if (result === true) {
        preloadSwrCache(mutate)
        router.replace('/dashboard')
        return
      }
      if (result === 'email_not_verified') {
        const msg = 'Validez votre email avant de vous connecter. Consultez le lien envoyé à votre adresse.'
        setError(msg)
        setShowResendConfirmation(true)
        toast.error('Connexion', { description: msg })
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

  const handleResendConfirmation = async () => {
    if (!email?.trim()) return
    setResendLoading(true)
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.success('Connexion', { description: data.message || 'Un nouveau lien vous a été envoyé.' })
      } else {
        toast.error('Connexion', { description: data.error || 'Erreur lors de l\'envoi.' })
      }
    } catch {
      toast.error('Connexion', { description: 'Erreur lors de l\'envoi.' })
    } finally {
      setResendLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    )
  }

  if (user) return null

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <Logo size={32} />
          <span className="sr-only">Tableau de bord</span>
        </Link>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Connexion</CardTitle>
            <CardDescription>
              Connectez-vous à votre tableau de bord
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="votre@email.com"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="size-4 text-muted-foreground" aria-hidden /> : <Eye className="size-4 text-muted-foreground" aria-hidden />}
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>
                </Field>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm font-normal cursor-pointer text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Se souvenir de moi
                  </Label>
                </div>
                {error && (
                  <div
                    className="rounded-lg p-3 text-sm text-center bg-destructive/10 border border-destructive/20 text-destructive space-y-2"
                    role="alert"
                    aria-live="polite"
                  >
                    <p>{error}</p>
                    {showResendConfirmation && (
                      <Button
                        type="button"
                        variant="link"
                        onClick={handleResendConfirmation}
                        disabled={resendLoading}
                        className="h-auto p-0 text-destructive font-semibold underline"
                      >
                        {resendLoading ? 'Envoi...' : 'Renvoyer l\'email de confirmation'}
                      </Button>
                    )}
                  </div>
                )}
                <Field>
                  <Button type="submit" disabled={loading} className="w-full" size="lg">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 size-5 animate-spin" />
                        Connexion en cours...
                      </>
                    ) : (
                      'Se connecter'
                    )}
                  </Button>
                  <FieldDescription className="text-center">
                    Pas encore de compte ?{' '}
                    <Link href="/register" className="underline underline-offset-4">
                      S&apos;inscrire
                    </Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-muted flex min-h-svh items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Chargement...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
