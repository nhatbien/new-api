'use client'

import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { handleServerError } from '@/lib/handle-server-error'
import { DirectionProvider } from '@/context/direction-provider'
import { FontProvider } from '@/context/font-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { useAuthStore } from '@/stores/auth-store'
import {
  I18N_DEFAULT_LNG,
  I18N_STORAGE_KEY,
  I18N_SUPPORTED,
} from '@/i18n/config'
import '@/i18n/config'
import i18next from 'i18next'
import { toast } from 'sonner'

const isProduction = process.env.NODE_ENV === 'production'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (failureCount >= 0 && !isProduction) return false
          if (failureCount > 3 && isProduction) return false
          return !(
            error instanceof AxiosError &&
            [401, 403].includes(error.response?.status ?? 0)
          )
        },
        refetchOnWindowFocus: isProduction,
        staleTime: 10 * 1000,
      },
      mutations: {
        onError: (error) => {
          handleServerError(error)
          if (error instanceof AxiosError && error.response?.status === 304) {
            toast.error(i18next.t('Content not modified!'))
          }
        },
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof AxiosError) {
          if (error.response?.status === 401) {
            toast.error(i18next.t('Session expired!'))
            useAuthStore.getState().auth.reset()
          }
        }
      },
    }),
  })
}

let browserQueryClient: QueryClient | undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new QueryClient
    return makeQueryClient()
  }
  // Browser: reuse the same QueryClient
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient)

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(I18N_STORAGE_KEY)
    } catch {
      stored = null
    }
    const normalized = stored?.split('-')[0]
    const next =
      normalized && (I18N_SUPPORTED as readonly string[]).includes(normalized)
        ? normalized
        : I18N_DEFAULT_LNG
    if (next !== i18next.language) {
      void i18next.changeLanguage(next)
    }
    try {
      localStorage.setItem(I18N_STORAGE_KEY, next)
    } catch {
      // ignore storage errors
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FontProvider>
          <DirectionProvider>
            {children}
          </DirectionProvider>
        </FontProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
