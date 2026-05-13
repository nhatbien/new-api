'use client'

import dynamic from 'next/dynamic'

export const LegacyApp = dynamic(
  () => import('./legacy-app-inner').then((module) => module.LegacyApp),
  { ssr: false }
)
