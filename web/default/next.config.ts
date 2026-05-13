import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // SSR enabled for homepage; dashboard remains client-side only
  trailingSlash: true,
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
