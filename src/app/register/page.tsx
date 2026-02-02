'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    company: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/dashboard')
    }
  }, [authLoading, user, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    if (formData.password !== formData.confirmPassword) {
      const msg = 'Les mots de passe ne correspondent pas'
      setError(msg)
      toast.error('Inscription', { description: msg })
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      const msg = 'Le mot de passe doit contenir au moins 6 caractères'
      setError(msg)
      toast.error('Inscription', { description: msg })
      setLoading(false)
      return
    }

    try {
      const response = await electronFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          company: formData.company,
        }),
      })

      const data = await response.json()

      if (response.ok || response.status === 201) {
        setSuccess(true)
        const msg = data.message || 'Un email de confirmation vous a été envoyé.'
        toast.success('Inscription', { description: msg })
        setTimeout(() => {
          router.push('/login')
          router.refresh()
        }, 3000)
      } else {
        const msg = data.error || "Erreur lors de l'inscription"
        setError(msg)
        toast.error('Inscription', { description: msg })
      }
    } catch {
      const msg = "Erreur lors de l'inscription"
      setError(msg)
      toast.error('Inscription', { description: msg })
    } finally {
      setLoading(false)
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

  if (success) {
    return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="mx-auto size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <CheckCircle className="size-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Inscription enregistrée</h2>
                <p className="text-muted-foreground text-sm">
                  Un email de confirmation vous a été envoyé. Cliquez sur le lien pour activer votre compte, puis connectez-vous.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Redirection vers la page de connexion...</p>
              <div className="w-full rounded-full h-1 bg-secondary overflow-hidden">
                <div className="h-full bg-primary animate-pulse origin-left w-full" style={{ animationDuration: '3s' }} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-md">
        <Link href="/" className="flex items-center gap-2 self-center font-medium mb-6 justify-center">
          <Logo size={32} />
          <span className="sr-only">Tableau de bord</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Créer un compte</CardTitle>
            <CardDescription>
              Entrez vos informations ci-dessous pour créer votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate>
              <FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="firstName">Prénom</FieldLabel>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      placeholder="Jean"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="lastName">Nom</FieldLabel>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                      placeholder="Dupont"
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="votre@email.com"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="company">Entreprise (optionnel)</FieldLabel>
                  <Input
                    id="company"
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Mon Entreprise"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
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
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmPassword">Confirmer le mot de passe</FieldLabel>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="pr-10"
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      aria-label={showConfirmPassword ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                    >
                      {showConfirmPassword ? <EyeOff className="size-4 text-muted-foreground" aria-hidden /> : <Eye className="size-4 text-muted-foreground" aria-hidden />}
                    </Button>
                  </div>
                </Field>
                {error && (
                  <div className="rounded-lg p-3 text-sm text-center bg-destructive/10 border border-destructive/20 text-destructive" role="alert">
                    {error}
                  </div>
                )}
                <Field>
                  <Button type="submit" disabled={loading} className="w-full" size="lg">
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 size-5 animate-spin" />
                        Création du compte...
                      </>
                    ) : (
                      'Créer mon compte'
                    )}
                  </Button>
                  <FieldDescription className="text-center mt-4">
                    Vous avez déjà un compte ?{' '}
                    <Link href="/login" className="underline underline-offset-4">
                      Se connecter
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
