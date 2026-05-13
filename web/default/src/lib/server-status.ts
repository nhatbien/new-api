import { headers } from 'next/headers'
import { DEFAULT_LOGO, DEFAULT_SYSTEM_NAME } from '@/lib/constants'

interface StatusApiResponse {
  success: boolean
  data?: {
    system_name?: string
    logo?: string
  }
}

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

export async function getServerStatus() {
  const configuredOrigin = normalizeServerURL(
    process.env.NEXT_PUBLIC_REACT_APP_SERVER_URL
  )
  const origin = configuredOrigin ?? (await getRequestOrigin())
  if (!origin) {
    return {
      systemName: DEFAULT_SYSTEM_NAME,
      logo: DEFAULT_LOGO,
    }
  }

  try {
    const response = await fetch(`${origin}/api/status`, { cache: 'no-store' })
    if (!response.ok) throw new Error('Failed to fetch status')

    const result = (await response.json()) as StatusApiResponse
    return {
      systemName: result.success
        ? result.data?.system_name || DEFAULT_SYSTEM_NAME
        : DEFAULT_SYSTEM_NAME,
      logo: result.success ? result.data?.logo || DEFAULT_LOGO : DEFAULT_LOGO,
    }
  } catch {
    return {
      systemName: DEFAULT_SYSTEM_NAME,
      logo: DEFAULT_LOGO,
    }
  }
}
