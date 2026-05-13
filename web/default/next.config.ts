import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // SSR for `/` (SEO); other routes rendered client-side via [...path] catch-all.
  output: 'standalone',
  trailingSlash: false,
  env: {
    NEXT_PUBLIC_REACT_APP_SERVER_URL:
      process.env.NEXT_PUBLIC_REACT_APP_SERVER_URL || '',
    NEXT_PUBLIC_APP_VERSION:
      process.env.NEXT_PUBLIC_APP_VERSION ||
      process.env.VITE_REACT_APP_VERSION ||
      '',
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
