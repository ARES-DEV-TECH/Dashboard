import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth-provider'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/toaster'
import { NavigationProgress } from '@/components/NavigationProgress'

export const metadata: Metadata = {
  title: "ARES Dashboard - Pilotage d'entreprise",
  description: "Dashboard ARES - Gestion clients, services, ventes et charges",
  icons: { icon: '/images/Logo.png', apple: '/images/Logo.png' },
}

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5, viewportFit: 'cover' as const }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="dark">
      <body className="font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Aller au contenu
        </a>
        <AuthProvider>
          <NavigationProgress />
          <AppLayout>{children}</AppLayout>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
