import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  experimental: { optimizeCss: true, optimizePackageImports: ['lucide-react', 'recharts'] },
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true, formats: ['image/webp'] },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || '',
  project: process.env.SENTRY_PROJECT || '',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
})