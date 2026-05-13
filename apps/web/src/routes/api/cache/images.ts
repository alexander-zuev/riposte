import { routeErrorMiddleware } from '@server/infrastructure/middleware'
import { createFileRoute } from '@tanstack/react-router'
import { waitUntil } from 'cloudflare:workers'
import { z } from 'zod'

/**
 * Proxies external images, primarily auth avatars, through our edge.
 */
const MAX_IMAGE_SIZE = 2 * 1024 * 1024
const CACHE_TTL = 7 * 24 * 60 * 60

const ALLOWED_DOMAIN_PATTERN =
  /\.(googleusercontent|ggpht|apple|facebook|fbsbx|microsoft|live|githubusercontent|gravatar)\.com$/i

const imageProxyUrlSchema = z.url({
  hostname: ALLOWED_DOMAIN_PATTERN,
})

const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

async function fetchImage(url: string): Promise<Response | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Riposte-Image-Proxy/1.0' },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg'

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return new Response('Invalid image format', { status: 415 })
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && Number.parseInt(contentLength) > MAX_IMAGE_SIZE) {
      return new Response('Image too large', { status: 413 })
    }

    const imageBuffer = await response.arrayBuffer()
    if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
      return new Response('Image too large', { status: 413 })
    }

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.byteLength.toString(),
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
      },
    })
  } catch {
    return null
  }
}

export const Route = createFileRoute('/api/cache/images')({
  server: {
    middleware: [routeErrorMiddleware],
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url)
        const url = searchParams.get('url')

        if (!url) {
          return new Response('Missing url parameter', { status: 400 })
        }

        const result = imageProxyUrlSchema.safeParse(url)
        if (!result.success) {
          return new Response('Invalid URL', { status: 400 })
        }

        const cache = await caches.open('images')
        const cached = await cache.match(request)
        if (cached) {
          return new Response(cached.body, {
            headers: {
              ...Object.fromEntries(cached.headers),
              'X-Cache': 'HIT',
            },
          })
        }

        const response = await fetchImage(url)
        if (!response) {
          return new Response('Failed to load image', { status: 502 })
        }

        if (!response.ok) return response

        waitUntil(cache.put(request, response.clone()))

        return new Response(response.body, {
          headers: {
            ...Object.fromEntries(response.headers),
            'X-Cache': 'MISS',
          },
        })
      },
    },
  },
})
