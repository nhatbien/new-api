import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND_URL = (process.env.BACKEND_URL || '').replace(/\/$/, '')

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
])

async function proxy(req: NextRequest) {
  if (!BACKEND_URL) {
    return new Response(
      JSON.stringify({ success: false, message: 'BACKEND_URL not set' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    )
  }

  const incoming = new URL(req.url)
  const target = `${BACKEND_URL}${incoming.pathname}${incoming.search}`

  const headers = new Headers()
  for (const [k, v] of req.headers.entries()) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) headers.set(k, v)
  }

  const body =
    req.method === 'GET' || req.method === 'HEAD'
      ? undefined
      : await req.arrayBuffer()

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body,
    redirect: 'manual',
    cache: 'no-store',
  })

  const respHeaders = new Headers()
  upstream.headers.forEach((v, k) => {
    if (!HOP_BY_HOP.has(k.toLowerCase())) respHeaders.set(k, v)
  })

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const OPTIONS = proxy
export const HEAD = proxy
