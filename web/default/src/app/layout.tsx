import type { Metadata, Viewport } from 'next'
import { getServerStatus } from '@/lib/server-status'
import '@/styles/index.css'

export async function generateMetadata(): Promise<Metadata> {
  const status = await getServerStatus()

  return {
    title: status.systemName,
    description: 'Unified AI API gateway and admin dashboard.',
    icons: {
      icon: '/favicon.ico',
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fff',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
