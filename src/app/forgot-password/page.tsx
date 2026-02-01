'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const [resetLink, setResetLink] = useState<string | null>(null)
  const [emailNotConfigured, setEmailNotConfigured] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResetLink(null)
    setEmailNotConfigured(false)
    setLoading(true)
    try {
      const res = await electronFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSent(true)
        if (data.resetLink) setResetLink(data.resetLink)
        if (data.emailNotConfigured) setEmailNotConfigured(true)
        toast.success('Mot de passe oublié', { description: 'Si un compte existe, un email a été envoyé.' })
      } else {
        const msg = data.error || 'Une erreur est survenue.'
        setError(msg)
        toast.error('Mot de passe oublié', { description: msg })
      }
    } catch {
      const msg = 'Une erreur est survenue.'
      setError(msg)
      toast.error('Mot de passe oublié', { description: msg })
    } finally {
      setLoading(false)
    }
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
              Mot de passe oublié
            </CardTitle>
            <CardDescription className="text-foreground/80">
              Entrez votre email pour recevoir un lien de réinitialisation.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <div className="rounded-lg p-4 bg-primary/10 border border-primary/20 text-foreground text-center space-y-2">
              <p className="font-medium">Email envoyé</p>
              <p className="text-sm text-foreground/80">
                Si un compte existe avec cet email, vous recevrez un lien. Vérifiez aussi les spams.
              </p>
              {resetLink && (
                <p className="text-xs text-left break-all pt-2 border-t border-primary/20">
                  {emailNotConfigured && (
                    <span className="text-amber-600 dark:text-amber-400 block mb-1">
                      L&apos;envoi d&apos;emails n&apos;est pas configuré sur ce serveur. Utilisez le lien ci-dessous (gardez-le confidentiel).
                    </span>
                  )}
                  {!emailNotConfigured && <span className="text-muted-foreground">En dev, lien de test : </span>}
                  <a href={resetLink} className="text-primary hover:underline">
                    Réinitialiser le mot de passe
                  </a>
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-4 py-3 rounded-lg"
                  placeholder="votre@email.com"
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
                    Envoi en cours...
                  </>
                ) : (
                  'Envoyer le lien'
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
