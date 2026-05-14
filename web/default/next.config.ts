import type { NextConfig } from 'next'

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_REACT_APP_SERVER_URL ||
  ''
).replace(/\/$/, '')

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
  async rewrites() {
    if (!BACKEND_URL) return []
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/v1/:path*',
        destination: `${BACKEND_URL}/v1/:path*`,
      },
      {
        source: '/pg/:path*',
        destination: `${BACKEND_URL}/pg/:path*`,
      },
    ]
  },
}

export default nextConfig
