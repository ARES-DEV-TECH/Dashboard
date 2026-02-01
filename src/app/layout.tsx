import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth-provider'
import { AppLayout } from '@/components/layout/AppLayout'
import { Toaster } from '@/components/toaster'

const inter = Inter({ variable: '--font-sans-app', subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: "ARES Dashboard - Pilotage d'entreprise",
  description: "Dashboard ARES - Gestion clients, services, ventes et charges",
  icons: { icon: '/images/Logo.png', apple: '/images/Logo.png' },
}

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5, viewportFit: 'cover' as const }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} font-sans antialiased`}>
        <a href="#main-content" className="skip-link">
          Aller au contenu
        </a>
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
