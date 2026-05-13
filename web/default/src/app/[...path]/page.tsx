'use client'

import { AppProviders } from '@/components/app-providers'
import { NextAppShell } from '@/components/next-app-shell'

export default function CatchAllPage() {
  return (
    <AppProviders>
      <NextAppShell />
    </AppProviders>
  )
}
