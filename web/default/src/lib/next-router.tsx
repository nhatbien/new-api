'use client'

import * as React from 'react'
import NextLink from 'next/link'
import {
  useParams as useNextParams,
  usePathname,
  useRouter as useNextRouter,
  useSearchParams,
} from 'next/navigation'

type SearchRecord = Record<string, unknown>

type NavigateOptions = {
  to?: string
  params?: SearchRecord
  search?:
    | true
    | SearchRecord
    | ((prev: SearchRecord) => SearchRecord | Partial<SearchRecord>)
  replace?: boolean
}

export type LinkProps = Omit<
  React.ComponentPropsWithoutRef<typeof NextLink>,
  'href'
> & {
  to: string
  params?: SearchRecord
  search?: SearchRecord
  disabled?: boolean
  reloadDocument?: boolean
}

function normalizeSearchValue(value: string): unknown {
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^-?\d+$/.test(value)) return Number(value)
  return value
}

function useSearchObject(): SearchRecord {
  const params = useSearchParams()
  return React.useMemo(() => {
    const search: SearchRecord = {}
    params.forEach((value, key) => {
      search[key] = normalizeSearchValue(value)
    })
    return search
  }, [params])
}

function interpolatePath(to: string, params?: SearchRecord) {
  let path = to
  for (const [key, value] of Object.entries(params ?? {})) {
    path = path.replaceAll(`$${key}`, encodeURIComponent(String(value)))
  }
  return path.replace('/_authenticated', '').replace(/\/+/g, '/')
}

function buildHref(
  options: NavigateOptions & { to: string },
  currentSearch: SearchRecord = {}
) {
  const path = interpolatePath(options.to, options.params)
  const nextSearch =
    options.search === true
      ? currentSearch
      : typeof options.search === 'function'
        ? options.search(currentSearch)
        : (options.search ?? {})
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(nextSearch)) {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      value === false
    ) {
      continue
    }
    searchParams.set(key, String(value))
  }

  const query = searchParams.toString()
  return query ? `${path}?${query}` : path
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  function Link(
    { to, params, search, disabled, reloadDocument, ...props },
    ref
  ) {
    const href = buildHref({ to, params, search })

    if (reloadDocument || disabled) {
      return (
        <a
          {...props}
          ref={ref}
          href={disabled ? undefined : href}
          aria-disabled={disabled || props['aria-disabled']}
        />
      )
    }

    return <NextLink {...props} ref={ref} href={href} />
  }
)

export function useNavigate() {
  const router = useNextRouter()
  const currentSearch = useSearchObject()

  return React.useCallback(
    (options: NavigateOptions) => {
      const href = buildHref(
        {
          ...options,
          to: options.to ?? window.location.pathname,
        },
        currentSearch
      )
      if (options.replace) {
        router.replace(href)
      } else {
        router.push(href)
      }
    },
    [currentSearch, router]
  )
}

export function useSearch<TSearch = Record<string, any>>(
  _options?: unknown
): TSearch {
  return useSearchObject() as TSearch
}

export function useLocation(): { pathname: string; href: string }
export function useLocation<T>(options: {
  select?: (location: { pathname: string; href: string }) => T
}): T
export function useLocation<T>(options?: {
  select?: (location: { pathname: string; href: string }) => T
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const location = React.useMemo(
    () => ({
      pathname,
      href: query ? `${pathname}?${query}` : pathname,
    }),
    [pathname, query]
  )

  return options?.select ? options.select(location) : location
}

export function useParams<TParams = Record<string, any>>(
  _options?: unknown
): TParams {
  const nextParams = useNextParams()
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean)
  const inferred: SearchRecord = { ...nextParams }
  const last = parts.at(-1)

  if (last) inferred.section = last
  if (parts[0] === 'pricing' && parts[1]) inferred.modelId = parts[1]
  if (parts[0] === 'oauth' && parts[1]) inferred.provider = parts[1]
  if (parts[0] === 'chat' && parts[1]) inferred.chatId = parts[1]
  if (parts[0] === 'errors' && parts[1]) inferred.error = parts[1]

  return inferred as TParams
}

export function useRouter() {
  const router = useNextRouter()
  return {
    history: {
      back: () => router.back(),
      go: (delta: number) => {
        if (delta < 0) router.back()
      },
      location: {
        href: typeof window === 'undefined' ? '/' : window.location.href,
      },
    },
    navigate: (options: NavigateOptions) => {
      const href = buildHref({
        ...options,
        to:
          options.to ??
          (typeof window === 'undefined' ? '/' : window.location.pathname),
      })
      if (options.replace) router.replace(href)
      else router.push(href)
    },
  }
}

type RouterStateCompat = { location: { pathname: string }; status: string }

export function useRouterState(): RouterStateCompat
export function useRouterState<T>(options: {
  select?: (state: RouterStateCompat) => T
}): T
export function useRouterState<T>(options?: {
  select?: (state: { location: { pathname: string }; status: 'idle' }) => T
}) {
  const pathname = usePathname()
  const state = React.useMemo(
    () => ({ location: { pathname }, status: 'idle' as const }),
    [pathname]
  )
  return options?.select ? options.select(state) : state
}

export function getRouteApi(_path: string) {
  return {
    useParams,
    useSearch,
    useNavigate,
  }
}

export function Outlet() {
  return null
}

export function useBlocker(_options?: unknown) {
  return { status: 'idle', proceed: () => undefined, reset: () => undefined }
}

export function redirect(options: NavigateOptions) {
  return options
}
