import axios from 'axios'
import i18next from 'i18next'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

declare global {
  interface Window {
    __APP_CONFIG__?: {
      VITE_REACT_APP_SERVER_URL?: string
    }
  }
}

// ============================================================================
// Axios Instance Configuration
// ============================================================================

const runtimeBaseUrl = Object.prototype.hasOwnProperty.call(
  window.__APP_CONFIG__ || {},
  'VITE_REACT_APP_SERVER_URL'
)
  ? window.__APP_CONFIG__?.VITE_REACT_APP_SERVER_URL
  : undefined

// Base URL: empty string for same-origin API requests. Runtime config wins even
// when it intentionally sets an empty string to override a build-time URL.
export const baseURL = (
  runtimeBaseUrl ??
  import.meta.env.VITE_REACT_APP_SERVER_URL ??
  ''
).replace(/\/$/, '')

export function getApiUrl(path: string): string {
  if (!baseURL) return path
  if (/^https?:\/\//i.test(path)) return path
  return `${baseURL}${path.startsWith('/') ? path : `/${path}`}`
}

function normalizeRequestUrl(url?: string): string | undefined {
  if (!url || /^https?:\/\//i.test(url)) return url
  return url.replace(/\/(\?|$)/, '$1')
}

// Create axios instance with default config
export const api = axios.create({
  baseURL,
  withCredentials: true, // Include cookies in cross-origin requests
})

// ============================================================================
// Request Deduplication
// ============================================================================

// Deduplicate concurrent GET requests to the same URL
// Prevents multiple identical requests from being sent simultaneously
const inFlightGet = new Map<string, Promise<unknown>>()
const originalGet = api.get.bind(api)

api.get = ((url: string, config = {}) => {
  const disableDuplicate = (config as unknown as Record<string, unknown>)
    ?.disableDuplicate
  if (disableDuplicate) return originalGet(url, config)

  const params = (config as unknown as Record<string, unknown>)?.params
    ? JSON.stringify((config as unknown as Record<string, unknown>).params)
    : '{}'
  const key = `${url}?${params}`

  // Return existing in-flight request if available
  if (inFlightGet.has(key)) return inFlightGet.get(key)!

  // Create new request and clean up after completion
  const req = originalGet(url, config).finally(() => inFlightGet.delete(key))
  inFlightGet.set(key, req)
  return req
}) as typeof api.get

// ============================================================================
// Response Interceptor
// ============================================================================

// Handle business logic errors and HTTP errors globally
api.interceptors.response.use(
  (response) => {
    const skipBusiness = (response.config as unknown as Record<string, unknown>)
      ?.skipBusinessError

    // Unified business response format: { success, message, data }
    if (
      !skipBusiness &&
      response &&
      response.data &&
      typeof response.data.success === 'boolean'
    ) {
      if (!response.data.success) {
        // Show error toast for business failures
        const msg = response.data.message || 'Request failed'
        toast.error(msg)
      }
    }
    return response
  },
  (error) => {
    const skip = error?.config?.skipErrorHandler
    if (!skip) {
      const status = error?.response?.status

      if (status === 401) {
        // Unauthorized: clear auth state and show toast
        toast.error(i18next.t('Session expired!'))
        try {
          useAuthStore.getState().auth.reset()
        } catch {
          /* empty */
        }
      } else {
        // Other errors: show error message from response or default
        const msg =
          error?.response?.data?.message || error?.message || 'Request error'
        toast.error(msg)
      }
    }
    return Promise.reject(error)
  }
)

// ============================================================================
// Common Headers Utility
// ============================================================================

/**
 * Get common request headers (for both axios and SSE requests)
 */
export function getCommonHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  return headers
}

// ============================================================================
// Request Interceptor
// ============================================================================

// Attach user ID header for all requests
api.interceptors.request.use((config) => {
  config.url = normalizeRequestUrl(config.url)
  return config
})

// ============================================================================
// Common API Functions
// ============================================================================

// ----------------------------------------------------------------------------
// User APIs
// ----------------------------------------------------------------------------

// Get current user info
export async function getSelf() {
  const res = await api.get('/api/user/self', {
    // Avoid global 401 toast during guards/preloads
    skipErrorHandler: true,
  } as Record<string, unknown>)
  return res.data
}

// Get user available models
export async function getUserModels(): Promise<{
  success: boolean
  message?: string
  data?: string[]
}> {
  const res = await api.get('/api/user/models')
  return res.data
}

// Get user groups with descriptions and ratios
export async function getUserGroups(): Promise<{
  success: boolean
  message?: string
  data?: Record<string, { desc: string; ratio: number | string }>
}> {
  const res = await api.get('/api/user/self/groups')
  return res.data
}

// ----------------------------------------------------------------------------
// System APIs
// ----------------------------------------------------------------------------

// Get system status
export async function getStatus() {
  const res = await api.get('/api/status')
  return res.data?.data as Record<string, unknown>
}

// Get system notice
export async function getNotice(): Promise<{
  success: boolean
  message?: string
  data?: string
}> {
  const res = await api.get('/api/notice')
  return res.data
}

// ----------------------------------------------------------------------------
// 2FA Management APIs
// ----------------------------------------------------------------------------

// Get 2FA status
export async function get2FAStatus() {
  const res = await api.get('/api/user/2fa/status')
  return res.data
}

// Setup 2FA
export async function setup2FA() {
  const res = await api.post('/api/user/2fa/setup')
  return res.data
}

// Enable 2FA with verification code
export async function enable2FA(code: string) {
  const res = await api.post('/api/user/2fa/enable', { code })
  return res.data
}

// Disable 2FA with verification code
export async function disable2FA(code: string) {
  const res = await api.post('/api/user/2fa/disable', { code })
  return res.data
}

// Regenerate 2FA backup codes
export async function regenerate2FABackupCodes(code: string) {
  const res = await api.post('/api/user/2fa/backup_codes', { code })
  return res.data
}
