import { headers } from 'next/headers'
import type { HomePageContentResponse } from './types'

function normalizeServerURL(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\/$/, '')
  return normalized || undefined
}

async function getRequestOrigin(): Promise<string | undefined> {
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
  if (!host) return undefined

  const protocol =
    headerStore.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.0.0.1')
      ? 'http'
      : 'https')

  return `${protocol}://${host}`
}

export async function getServerHomePageContent(): Promise<string> {
  const configuredOrigin = normalizeServerURL(
    process.env.NEXT_PUBLIC_REACT_APP_SERVER_URL
  )
  const origin = configuredOrigin ?? (await getRequestOrigin())
  if (!origin) return ''

  try {
    const response = await fetch(`${origin}/api/home_page_content`, {
      cache: 'no-store',
    })
    if (!response.ok) return ''

    const result = (await response.json()) as HomePageContentResponse
    return result.success && result.data ? result.data : ''
  } catch {
    return ''
  }
}
