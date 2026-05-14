import { NextResponse, type NextRequest } from 'next/server'

// One-shot cache nuker: when the bust cookie is missing, force browsers to
// drop ALL cached state for this origin (stale 301s from old proxy config,
// HTTP/3 alt-svc, service workers, etc.), then set a cookie so the heavy
// headers only fire once per browser.
//
// Bump CACHE_BUST_VERSION whenever you need to evict everyone again.
const CACHE_BUST_VERSION = 'v1'
const CACHE_BUST_COOKIE = 'cache_bust'

export function proxy(req: NextRequest) {
  const res = NextResponse.next()

  // Always tell browsers to stop using HTTP/3 for this origin (Caddy/Traefik
  // may advertise it via Alt-Svc; CORS edge cases under h3 caused intermittent
  // failures).
  res.headers.set('Alt-Svc', 'clear')

  const cookie = req.cookies.get(CACHE_BUST_COOKIE)?.value
  if (cookie !== CACHE_BUST_VERSION) {
    // Wipe HTTP cache, service workers, and any cached navigation responses
    // (including the stale 301s old users had pinned). Cookies/storage are
    // intentionally NOT cleared to preserve login.
    res.headers.set('Clear-Site-Data', '"cache"')
    res.cookies.set(CACHE_BUST_COOKIE, CACHE_BUST_VERSION, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      secure: true,
    })
  }

  return res
}

export const config = {
  // Run on HTML navigations only — Clear-Site-Data on every asset would
  // re-clear caches mid-load and break the page.
  matcher: ['/((?!_next/|favicon\\.ico|.*\\.).*)'],
}
