'use client'

import { useEffect, useMemo, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import i18next from 'i18next'
import { Loader2, MessageCircleWarning } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { getSelf, getStatus, api } from '@/lib/api'
import '@/lib/dayjs'
import { Link } from '@/lib/next-router'
import { ROLE } from '@/lib/roles'
import { ThemeCustomizationProvider } from '@/context/theme-customization-provider'
import { useSystemConfig } from '@/hooks/use-system-config'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { AuthenticatedLayout } from '@/components/layout'
import { About } from '@/features/about'
import { wechatLoginByCode } from '@/features/auth/api'
import { OAuthCallbackScreen } from '@/features/auth/components/oauth-callback-screen'
import { OAUTH_BIND_STORAGE_KEY } from '@/features/auth/constants'
import { ForgotPassword } from '@/features/auth/forgot-password'
import { Otp } from '@/features/auth/otp'
import {
  ResetPasswordConfirm,
  type ResetPasswordSearchParams,
} from '@/features/auth/reset-password-confirm'
import { SignIn } from '@/features/auth/sign-in'
import { SignUp } from '@/features/auth/sign-up'
import { Channels } from '@/features/channels'
import { useChatPresets } from '@/features/chat/hooks/use-chat-presets'
import { resolveChatUrl } from '@/features/chat/lib/chat-links'
import { Dashboard } from '@/features/dashboard'
import { ForbiddenError } from '@/features/errors/forbidden'
import { GeneralError } from '@/features/errors/general-error'
import { MaintenanceError } from '@/features/errors/maintenance-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { UnauthorisedError } from '@/features/errors/unauthorized-error'
import { Home } from '@/features/home'
import { ApiKeys } from '@/features/keys'
import { getApiKeys } from '@/features/keys/api'
import { API_KEY_STATUS } from '@/features/keys/constants'
import { PrivacyPolicy } from '@/features/legal/privacy-policy'
import { UserAgreement } from '@/features/legal/user-agreement'
import { Models } from '@/features/models'
import { Playground } from '@/features/playground'
import { Pricing } from '@/features/pricing'
import { ModelDetails } from '@/features/pricing/components/model-details'
import { Profile } from '@/features/profile'
import { Rankings } from '@/features/rankings'
import { Redemptions } from '@/features/redemption-codes'
import { SetupWizard } from '@/features/setup'
import { getSetupStatus } from '@/features/setup/api'
import { Subscriptions } from '@/features/subscriptions'
import { SystemSettings } from '@/features/system-settings'
import { AuthSettings } from '@/features/system-settings/auth'
import { BillingSettings } from '@/features/system-settings/billing'
import { ContentSettings } from '@/features/system-settings/content'
import { ModelSettings } from '@/features/system-settings/models'
import { OperationsSettings } from '@/features/system-settings/operations'
import { SecuritySettings } from '@/features/system-settings/security'
import { SiteSettings } from '@/features/system-settings/site'
import { UsageLogs } from '@/features/usage-logs'
import { Users } from '@/features/users'
import { Wallet } from '@/features/wallet'

type AuthenticatedRoute = {
  element: ReactNode
  roles?: number[]
}

const SETUP_CHECKED_KEY = 'setup_status_checked'

let authTokenVerified = false

function initSystemBranding() {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return
    const apply = (name: string) => {
      document.title = name
      const metaTitle = document.querySelector(
        'meta[name="title"]'
      ) as HTMLMetaElement | null
      if (metaTitle) metaTitle.setAttribute('content', name)
    }

    try {
      const saved = localStorage.getItem('status')
      if (saved) {
        const s = JSON.parse(saved)
        if (s?.system_name) apply(s.system_name)
      }
    } catch {
      /* empty */
    }

    getStatus()
      .then((s) => {
        if (s?.system_name) {
          apply(s.system_name as string)
          try {
            localStorage.setItem('status', JSON.stringify(s))
          } catch {
            /* empty */
          }
        }
      })
      .catch(() => undefined)
  } catch {
    /* empty */
  }
}

function useSetupRedirect() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (pathname.startsWith('/setup')) return
    if (window.localStorage.getItem(SETUP_CHECKED_KEY) === 'true') return

    getSetupStatus()
      .then((status) => {
        if (status?.success && status.data && !status.data.status) {
          router.replace('/setup')
          return
        }
        window.localStorage.setItem(SETUP_CHECKED_KEY, 'true')
      })
      .catch(() => {
        window.localStorage.setItem(SETUP_CHECKED_KEY, 'true')
      })
  }, [pathname, router])
}

function OAuthBridge() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const search = useMemo(
    () =>
      Object.fromEntries(searchParams.entries()) as {
        redirect?: string
        provider?:
          | 'github'
          | 'discord'
          | 'oidc'
          | 'linuxdo'
          | 'telegram'
          | 'wechat'
        code?: string
        state?: string
      },
    [searchParams]
  )

  useEffect(() => {
    ;(async () => {
      try {
        if (search.provider === 'wechat' && search.code) {
          const loginRes = await wechatLoginByCode(search.code)
          const accessToken = (loginRes?.data as AuthUser | undefined)
            ?.access_token
          if (accessToken) {
            useAuthStore.getState().auth.setAccessToken(accessToken)
          }
        }
        const res = await getSelf()
        if (res?.success) {
          useAuthStore.getState().auth.setUser(res.data as AuthUser)
          router.replace(search.redirect || '/dashboard')
          return
        }
      } catch {
        /* empty */
      }
      toast.error(i18next.t('OAuth failed'))
      router.replace('/sign-in')
    })()
  }, [router, search])

  return null
}

function OAuthProviderCallback(props: { provider: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const search = useMemo(
    () =>
      Object.fromEntries(searchParams.entries()) as {
        code?: string
        state?: string
        redirect?: string
      },
    [searchParams]
  )
  const mode = typeof window !== 'undefined' && window.opener ? 'bind' : 'login'

  useEffect(() => {
    ;(async () => {
      const safeNavigate = (target: string) => router.replace(target)
      const isBindingFlow =
        typeof window !== 'undefined' && Boolean(window.opener)

      if (!search.code) {
        toast.error(i18next.t('Missing code'))
        safeNavigate('/sign-in')
        return
      }

      const notifyBindingResult = (status: 'success' | 'error') => {
        try {
          window.localStorage.setItem(
            OAUTH_BIND_STORAGE_KEY,
            JSON.stringify({
              provider: props.provider,
              status,
              timestamp: Date.now(),
            })
          )
        } catch {
          /* empty */
        }
      }

      const finalizeLogin = async () => {
        try {
          const selfResponse = await getSelf()
          if (selfResponse?.success && selfResponse.data) {
            useAuthStore.getState().auth.setUser(selfResponse.data as AuthUser)
            return true
          }
        } catch {
          /* empty */
        }
        return false
      }

      try {
        const res = await api.get(`/api/oauth/${props.provider}`, {
          params: { code: search.code, state: search.state },
          skipBusinessError: true,
        } as never)

        if (res?.data?.success) {
          if (res.data.message === 'bind') {
            notifyBindingResult('success')
            toast.success(i18next.t('Binding successful!'))
            if (isBindingFlow) window.close()
            else safeNavigate('/profile')
            return
          }

          const user = (res.data?.data ?? null) as AuthUser | null
          if (user) {
            if (user.access_token) {
              useAuthStore.getState().auth.setAccessToken(user.access_token)
            }
            useAuthStore.getState().auth.setUser(user)
            toast.success(i18next.t('Signed in successfully!'))
            safeNavigate(search.redirect || '/dashboard')
            return
          }
        }

        if (!isBindingFlow && (await finalizeLogin())) {
          safeNavigate(search.redirect || '/dashboard')
          return
        }

        notifyBindingResult('error')
        toast.error(res?.data?.message || i18next.t('OAuth failed'))
        if (!isBindingFlow) safeNavigate('/sign-in')
      } catch (error) {
        notifyBindingResult('error')
        toast.error(
          error instanceof Error ? error.message : i18next.t('OAuth failed')
        )
        if (!isBindingFlow) safeNavigate('/sign-in')
      }
    })()
  }, [props.provider, router, search])

  return <OAuthCallbackScreen provider={props.provider} mode={mode} />
}

function ResetPasswordRoute() {
  const searchParams = useSearchParams()
  const search = Object.fromEntries(
    searchParams.entries()
  ) as ResetPasswordSearchParams
  return <ResetPasswordConfirm email={search.email} token={search.token} />
}

function Chat2LinkPage() {
  const router = useRouter()
  const { chatPresets, serverAddress } = useChatPresets()
  const firstWebPreset = useMemo(
    () => chatPresets.find((preset) => preset.type === 'web'),
    [chatPresets]
  )

  const { data: activeKey } = useQuery({
    queryKey: ['chat2link-active-key'],
    queryFn: async () => {
      const result = await getApiKeys({ p: 1, size: 50 })
      if (!result.success) throw new Error(result.message)
      const items = result.data?.items ?? []
      const active = items.find(
        (item) => item.status === API_KEY_STATUS.ENABLED
      )
      return active?.key ?? null
    },
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!firstWebPreset) return
    if (activeKey === undefined) return
    if (!activeKey) {
      toast.error(i18next.t('No enabled tokens available'))
      router.replace('/keys')
      return
    }

    const url = resolveChatUrl({
      template: firstWebPreset.url,
      apiKey: activeKey,
      serverAddress,
    })
    if (url) window.location.href = url
  }, [activeKey, firstWebPreset, router, serverAddress])

  return (
    <div className='flex h-full flex-col items-center justify-center gap-3'>
      <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
      <p className='text-muted-foreground text-sm'>
        {i18next.t('Redirecting to chat page...')}
      </p>
    </div>
  )
}

function ChatPresetPage() {
  const pathname = usePathname()
  const chatId = pathname.split('/').filter(Boolean)[1]
  const { chatPresets, serverAddress } = useChatPresets()
  const preset = useMemo(() => {
    const index = Number(chatId)
    if (!Number.isInteger(index)) return undefined
    return chatPresets[index]
  }, [chatId, chatPresets])
  const isWebLink = preset?.type === 'web'
  const requiresActiveKey = useMemo(() => {
    if (!preset || !isWebLink) return false
    const url = preset.url ?? ''
    return url.includes('{key}') || url.includes('{cherryConfig}')
  }, [isWebLink, preset])

  const {
    data: activeKey,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['chat-active-key'],
    queryFn: async () => {
      const result = await getApiKeys({ p: 1, size: 50 })
      if (!result.success) {
        throw new Error(result.message || 'Failed to load API keys')
      }
      const items = result.data?.items ?? []
      const active = items.find(
        (item) => item.status === API_KEY_STATUS.ENABLED
      )
      if (!active) {
        throw new Error(
          'No enabled API key available. Please enable an API key first.'
        )
      }
      return active.key
    },
    enabled: Boolean(preset && requiresActiveKey),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const iframeSrc = useMemo(() => {
    if (!preset || !isWebLink) return ''
    if (requiresActiveKey && !activeKey) return ''
    return resolveChatUrl({
      template: preset.url,
      apiKey: requiresActiveKey ? activeKey : undefined,
      serverAddress,
    })
  }, [activeKey, isWebLink, preset, requiresActiveKey, serverAddress])

  if (!preset || !isWebLink) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-4 p-6 text-center'>
        <MessageCircleWarning className='text-muted-foreground h-12 w-12' />
        <div className='space-y-1'>
          <h2 className='text-lg font-semibold'>
            {i18next.t(
              preset ? 'Use sidebar shortcut' : 'Chat preset not found'
            )}
          </h2>
          <p className='text-muted-foreground'>
            {preset
              ? i18next.t(
                  'opens in an external client. Trigger it from the sidebar or API key actions to launch the configured application.'
                )
              : i18next.t(
                  'The requested chat preset does not exist or has been removed.'
                )}
          </p>
        </div>
        <Button variant='outline' render={<Link to='/dashboard' />}>
          {i18next.t('Return to dashboard')}
        </Button>
      </div>
    )
  }

  if (requiresActiveKey && isPending) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-4'>
        <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
        <p className='text-muted-foreground text-sm'>
          {i18next.t('Preparing your chat link…')}
        </p>
      </div>
    )
  }

  if (
    (requiresActiveKey && (isError || !activeKey || !iframeSrc)) ||
    !iframeSrc
  ) {
    const message =
      error instanceof Error
        ? error.message
        : i18next.t(
            'Unable to generate chat link. Please contact your administrator.'
          )
    return (
      <div className='flex h-full flex-col items-center justify-center p-6'>
        <Alert variant='destructive' className='max-w-xl'>
          <AlertTitle>{i18next.t('Unable to open chat')}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <iframe
      src={iframeSrc}
      key={iframeSrc}
      className='h-full w-full border-0'
      allow='camera; microphone'
      title={`Chat preset: ${preset.name}`}
    />
  )
}

function AuthGuard(props: { route: AuthenticatedRoute }) {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((state) => state.auth.user)
  const accessToken = useAuthStore((state) => state.auth.accessToken)

  useEffect(() => {
    if (!user || !accessToken) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    if (!authTokenVerified) {
      getSelf()
        .then((res) => {
          if (res?.success && res.data) {
            useAuthStore.getState().auth.setUser(res.data as AuthUser)
            authTokenVerified = true
            return
          }
          useAuthStore.getState().auth.reset()
          router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}`)
        })
        .catch(() => {
          useAuthStore.getState().auth.reset()
          router.replace(`/sign-in?redirect=${encodeURIComponent(pathname)}`)
        })
    }
  }, [accessToken, pathname, router, user])

  if (!user || !accessToken) return null
  if (props.route.roles && !props.route.roles.includes(user.role)) {
    return <ForbiddenError />
  }

  return <AuthenticatedLayout>{props.route.element}</AuthenticatedLayout>
}

function systemSettings(element: ReactNode) {
  return <SystemSettings>{element}</SystemSettings>
}

function getAuthenticatedRoute(parts: string[]): AuthenticatedRoute | null {
  const [first, second, third] = parts
  const section = second ?? ''

  switch (first) {
    case 'dashboard':
      return { element: <Dashboard /> }
    case 'channels':
      return { element: <Channels />, roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN] }
    case 'keys':
      return { element: <ApiKeys /> }
    case 'models':
      return { element: <Models />, roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN] }
    case 'playground':
      return { element: <Playground /> }
    case 'chat':
      return { element: <ChatPresetPage /> }
    case 'chat2link':
      return { element: <Chat2LinkPage /> }
    case 'profile':
      return { element: <Profile /> }
    case 'redemption-codes':
      return { element: <Redemptions />, roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN] }
    case 'subscriptions':
      return {
        element: <Subscriptions />,
        roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN],
      }
    case 'usage-logs':
      return { element: <UsageLogs /> }
    case 'users':
      return { element: <Users />, roles: [ROLE.ADMIN, ROLE.SUPER_ADMIN] }
    case 'wallet':
      return { element: <Wallet initialShowHistory={false} /> }
    case 'system-settings':
      if (section === 'site')
        return {
          element: systemSettings(<SiteSettings />),
          roles: [ROLE.SUPER_ADMIN],
        }
      if (section === 'auth')
        return {
          element: systemSettings(<AuthSettings />),
          roles: [ROLE.SUPER_ADMIN],
        }
      if (section === 'billing')
        return {
          element: systemSettings(<BillingSettings />),
          roles: [ROLE.SUPER_ADMIN],
        }
      if (section === 'content')
        return {
          element: systemSettings(<ContentSettings />),
          roles: [ROLE.SUPER_ADMIN],
        }
      if (section === 'models')
        return {
          element: systemSettings(<ModelSettings />),
          roles: [ROLE.SUPER_ADMIN],
        }
      if (section === 'operations')
        return {
          element: systemSettings(<OperationsSettings />),
          roles: [ROLE.SUPER_ADMIN],
        }
      if (section === 'security')
        return {
          element: systemSettings(<SecuritySettings />),
          roles: [ROLE.SUPER_ADMIN],
        }
      return {
        element: systemSettings(<SiteSettings />),
        roles: [ROLE.SUPER_ADMIN],
      }
    case '401':
      return { element: <UnauthorisedError /> }
    case '403':
      return { element: <ForbiddenError /> }
    case '500':
      return { element: <GeneralError /> }
    case '503':
      return { element: <MaintenanceError /> }
    default:
      void third
      return null
  }
}

interface NextAppShellProps {
  initialHomePageContent?: string
  initialHomePageContentLoaded?: boolean
}

function RouteSwitch(props: NextAppShellProps) {
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean)
  const [first, second] = parts

  if (!first) {
    return (
      <Home
        initialContent={props.initialHomePageContent}
        initialContentLoaded={props.initialHomePageContentLoaded}
      />
    )
  }
  if (first === 'about') return <About />
  if (first === 'pricing' && second) return <ModelDetails />
  if (first === 'pricing') return <Pricing />
  if (first === 'rankings') return <Rankings />
  if (first === 'privacy-policy') return <PrivacyPolicy />
  if (first === 'user-agreement') return <UserAgreement />
  if (first === 'setup') return <SetupWizard />
  if (first === 'sign-in') return <SignIn />
  if (first === 'sign-up') return <SignUp />
  if (first === 'forgot-password') return <ForgotPassword />
  if (first === 'otp') return <Otp />
  if (first === 'reset' || (first === 'user' && second === 'reset')) {
    return <ResetPasswordRoute />
  }
  if (first === 'oauth' && second)
    return <OAuthProviderCallback provider={second} />
  if (first === 'oauth') return <OAuthBridge />

  const route = getAuthenticatedRoute(parts)
  if (route) return <AuthGuard route={route} />

  return <NotFoundError />
}

export function NextAppShell(props: NextAppShellProps) {
  useSystemConfig({ autoLoad: true })
  useSetupRedirect()

  useEffect(() => {
    initSystemBranding()
  }, [])

  return (
    <ThemeCustomizationProvider>
      <RouteSwitch {...props} />
      <Toaster duration={5000} />
    </ThemeCustomizationProvider>
  )
}
