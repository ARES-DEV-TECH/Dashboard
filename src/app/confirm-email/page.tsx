'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'

function ConfirmEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Lien invalide : token manquant.')
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const res = await electronFetch('/api/auth/confirm-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok && data.success) {
          setStatus('success')
          setMessage(data.message || 'Compte activé. Vous pouvez vous connecter.')
          toast.success('Compte activé', { description: data.message })
          setTimeout(() => router.replace('/login?verified=1'), 2000)
        } else {
          setStatus('error')
          setMessage(data.error || 'Lien invalide ou expiré.')
          toast.error('Confirmation', { description: data.error })
        }
      } catch {
        if (cancelled) return
        setStatus('error')
        setMessage('Erreur lors de la validation. Réessayez.')
        toast.error('Confirmation', { description: 'Erreur réseau.' })
      }
    })()

    return () => { cancelled = true }
  }, [token, router])

  return (
    <div className="auth-page min-h-dvh min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background">
      <Card className="w-full max-w-md bg-card border border-border shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto flex justify-center">
            <Logo size={56} />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            Validation du compte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
              <p className="text-muted-foreground text-center">Vérification en cours...</p>
            </div>
          )}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
                <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" aria-hidden />
              </div>
              <p className="text-center text-foreground font-medium">{message}</p>
              <p className="text-sm text-muted-foreground text-center">Redirection vers la connexion...</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Aller à la connexion</Link>
              </Button>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-full bg-destructive/10 p-4">
                <XCircle className="h-10 w-10 text-destructive" aria-hidden />
              </div>
              <p className="text-center text-foreground">{message}</p>
              <p className="text-sm text-muted-foreground text-center">
                Vous pouvez vous réinscrire ou demander un nouvel email de confirmation.
              </p>
              <div className="flex gap-2 justify-center">
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">Connexion</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/register">S&apos;inscrire</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  )
}
