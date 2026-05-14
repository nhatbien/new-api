import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  trailingSlash: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '',
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },
}

export default nextConfig
