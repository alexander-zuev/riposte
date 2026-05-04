import { APP_ROUTES } from '@riposte/core/client'
import { routeErrorMiddleware } from '@server/infrastructure/middleware'
import { createFileRoute } from '@tanstack/react-router'
import { waitUntil } from 'cloudflare:workers'

const POSTHOG_HOST = 'https://us.i.posthog.com'
const ASSET_HOST = 'us-assets.i.posthog.com'

/**
 * PostHog Reverse Proxy
 * @docs https://posthog.com/docs/advanced/proxy/cloudflare
 *
 * Routes frontend analytics through our domain to bypass ad blockers.
 * PostHog uses two hosts:
 * - POSTHOG_HOST (us.i.posthog.com) - event capture, feature flags
 * - ASSET_HOST (us-assets.i.posthog.com) - static JavaScript files
 */

export const Route = createFileRoute('/api/relay/$')({
  server: {
    middleware: [routeErrorMiddleware],
    handlers: {
      GET: async ({ request }) => handleProxy(request),
      POST: async ({ request }) => handleProxy(request),
      OPTIONS: async ({ request }) => handleProxy(request),
    },
  },
})

async function handleProxy(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const pathname = url.pathname.replace(APP_ROUTES.relay.path, '')
  const search = url.search
  const pathWithParams = pathname + search

  if (pathname.startsWith('/static/')) {
    return retrieveStatic(request, pathWithParams)
  }

  return forwardRequest(request, pathWithParams)
}

async function retrieveStatic(request: Request, pathname: string): Promise<Response> {
  const cache = await caches.open('posthog-assets')
  let response = await cache.match(request)
  if (!response) {
    response = await fetch(`https://${ASSET_HOST}${pathname}`)
    waitUntil(cache.put(request, response.clone()))
  }
  return response
}

async function forwardRequest(request: Request, pathWithSearch: string): Promise<Response> {
  const originHeaders = new Headers(request.headers)
  originHeaders.delete('cookie')
  originHeaders.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') ?? '')

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'

  return await fetch(`${POSTHOG_HOST}${pathWithSearch}`, {
    method: request.method,
    headers: originHeaders,
    body: hasBody ? await request.arrayBuffer() : null,
    redirect: request.redirect,
  })
}
