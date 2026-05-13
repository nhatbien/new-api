import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { LegacyApp } from '@/components/legacy-app'
import '@/styles/index.css'

export const metadata: Metadata = {
  title: 'New API',
  description: 'Unified AI API gateway and admin dashboard.',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fff',
}

export default function RootLayout() {
  return (
    <html lang='en' suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script src='/env.js' strategy='beforeInteractive' />
        <LegacyApp />
      </body>
    </html>
  )
}
