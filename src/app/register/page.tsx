'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { useAuth } from '@/components/auth-provider'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Mail, Lock, User, Building, ArrowRight, Loader2, CheckCircle } from 'lucide-react'
import { electronFetch } from '@/lib/electron-api'
import { toast } from 'sonner'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    company: ''
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
      [e.target.name]: e.target.value
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
          company: formData.company
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
        const msg = data.error || 'Erreur lors de l\'inscription'
        setError(msg)
        toast.error('Inscription', { description: msg })
      }
    } catch (error) {
      const msg = 'Erreur lors de l\'inscription'
      setError(msg)
      toast.error('Inscription', { description: msg })
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#0a0a0a' }}>
        <Card className="w-full max-w-md shadow-2xl text-center" style={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.15)' }}>
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#667eea' }}>
              <CheckCircle className="w-8 h-8" style={{ color: '#ffffff' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#fafafa' }}>Inscription enregistrée</h2>
            <p className="mb-6" style={{ color: '#a3a3a3' }}>Un email de confirmation vous a été envoyé. Cliquez sur le lien pour activer votre compte, puis connectez-vous.</p>
            <p className="text-sm mb-3" style={{ color: '#71717a' }}>Redirection vers la page de connexion...</p>
            <div className="w-full rounded-full h-2" style={{ backgroundColor: '#262626' }}>
              <div className="rounded-full h-2 animate-pulse" style={{ backgroundColor: '#667eea' }}></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="auth-page min-h-screen flex items-center justify-center px-4 py-8 bg-background">
      <Card className="w-full max-w-md border shadow-xl" style={{ backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.15)' }}>
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto flex justify-center">
            <Logo size={56} />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold mb-2" style={{ color: '#fafafa' }}>Inscription</CardTitle>
            <CardDescription style={{ color: '#a3a3a3' }}>
              Créez votre compte
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="font-medium" style={{ color: '#fafafa' }}>
                    Prénom
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="border focus:!border-primary focus:!ring-primary/20 transition-all duration-200 pl-4 pr-4 py-3 rounded-lg"
                    placeholder="Jean"
                    style={{ backgroundColor: '#e5e5e5', color: '#0a0a0a', caretColor: '#0a0a0a', borderColor: '#737373' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="font-medium" style={{ color: '#fafafa' }}>
                    Nom
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="border focus:!border-primary focus:!ring-primary/20 transition-all duration-200 pl-4 pr-4 py-3 rounded-lg"
                    placeholder="Dupont"
                    style={{ backgroundColor: '#e5e5e5', color: '#0a0a0a', caretColor: '#0a0a0a', borderColor: '#737373' }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="font-medium" style={{ color: '#fafafa' }}>
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="border focus:!border-primary focus:!ring-primary/20 transition-all duration-200 pl-4 pr-4 py-3 rounded-lg"
                  placeholder="votre@email.com"
                  style={{ backgroundColor: '#e5e5e5', color: '#0a0a0a', caretColor: '#0a0a0a', borderColor: '#737373' }}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company" className="font-medium" style={{ color: '#fafafa' }}>
                  Entreprise (optionnel)
                </Label>
                <Input
                  id="company"
                  name="company"
                  type="text"
                  value={formData.company}
                  onChange={handleChange}
                  className="border focus:!border-primary focus:!ring-primary/20 transition-all duration-200 pl-4 pr-4 py-3 rounded-lg"
                  placeholder="Mon Entreprise"
                  style={{ backgroundColor: '#e5e5e5', color: '#0a0a0a', caretColor: '#0a0a0a', borderColor: '#737373' }}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="font-medium" style={{ color: '#fafafa' }}>
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="border focus:!border-primary focus:!ring-primary/20 transition-all duration-200 pl-4 pr-12 py-3 rounded-lg"
                    placeholder="••••••••"
                    style={{ backgroundColor: '#e5e5e5', color: '#0a0a0a', caretColor: '#0a0a0a', borderColor: '#737373' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors hover:opacity-80"
                    style={{ color: '#a3a3a3' }}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" aria-hidden /> : <Eye className="w-5 h-5" aria-hidden />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-medium" style={{ color: '#fafafa' }}>
                  Confirmer le mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="border focus:!border-primary focus:!ring-primary/20 transition-all duration-200 pl-4 pr-12 py-3 rounded-lg"
                    placeholder="••••••••"
                    style={{ backgroundColor: '#e5e5e5', color: '#0a0a0a', caretColor: '#0a0a0a', borderColor: '#737373' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors hover:opacity-80"
                    style={{ color: '#a3a3a3' }}
                    aria-label={showConfirmPassword ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" aria-hidden /> : <Eye className="w-5 h-5" aria-hidden />}
                  </button>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="rounded-lg p-3 text-sm text-center animate-in slide-in-from-top-2 duration-200" style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.3)', color: '#dc2626' }}>
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#667eea', color: '#ffffff' }}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Création du compte...
                </div>
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>
          
          <div className="text-center">
            <p className="text-sm" style={{ color: '#a3a3a3' }}>
              Déjà un compte ?{' '}
              <a href="/login" className="font-medium hover:underline" style={{ color: '#667eea' }}>
                Se connecter
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
