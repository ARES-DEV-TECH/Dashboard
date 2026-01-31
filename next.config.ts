import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: { optimizeCss: true, optimizePackageImports: ['lucide-react', 'recharts'] },
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true, formats: ['image/webp'] },
}

export default nextConfig