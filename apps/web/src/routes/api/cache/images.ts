import { ImageFetchFailedError, ImageTooLargeError, UnsupportedImageTypeError } from '@riposte/core'
import { resultToApiResponse } from '@server/infrastructure/http/api-result'
import { routeErrorMiddleware } from '@server/infrastructure/middleware'
import { RETRY } from '@server/infrastructure/resilience/retry'
import { createFileRoute } from '@tanstack/react-router'
import { Result } from 'better-result'
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

type ImageProxyError = ImageFetchFailedError | UnsupportedImageTypeError | ImageTooLargeError

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

        const parsedUrl = imageProxyUrlSchema.safeParse(url)
        if (!parsedUrl.success) {
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

        const result: Result<Response, ImageProxyError> = await Result.gen(async function* () {
          const upstream = yield* Result.await(
            Result.tryPromise(
              {
                try: () =>
                  fetch(url, {
                    headers: { 'User-Agent': 'Riposte-Image-Proxy/1.0' },
                    signal: AbortSignal.timeout(10000),
                  }),
                catch: (cause) => new ImageFetchFailedError({ cause }),
              },
              RETRY.externalApi,
            ),
          )

          if (!upstream.ok) {
            return Result.err(new ImageFetchFailedError({ status: upstream.status }))
          }

          const contentType = upstream.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg'
          if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
            return Result.err(new UnsupportedImageTypeError({ contentType }))
          }

          const contentLength = upstream.headers.get('content-length')
          if (contentLength && Number.parseInt(contentLength) > MAX_IMAGE_SIZE) {
            return Result.err(
              new ImageTooLargeError({
                actualBytes: Number.parseInt(contentLength),
                maxBytes: MAX_IMAGE_SIZE,
              }),
            )
          }

          const imageBuffer = yield* Result.await(
            Result.tryPromise({
              try: () => upstream.arrayBuffer(),
              catch: (cause) => new ImageFetchFailedError({ cause }),
            }),
          )

          if (imageBuffer.byteLength > MAX_IMAGE_SIZE) {
            return Result.err(
              new ImageTooLargeError({
                actualBytes: imageBuffer.byteLength,
                maxBytes: MAX_IMAGE_SIZE,
              }),
            )
          }

          return Result.ok(
            new Response(imageBuffer, {
              headers: {
                'Content-Type': contentType,
                'Content-Length': imageBuffer.byteLength.toString(),
                'Cache-Control': `public, max-age=${CACHE_TTL}`,
              },
            }),
          )
        })

        return resultToApiResponse(result, {
          ok: (response) => {
            waitUntil(cache.put(request, response.clone()))

            return new Response(response.body, {
              headers: {
                ...Object.fromEntries(response.headers),
                'X-Cache': 'MISS',
              },
            })
          },
          err: (error) => {
            if (UnsupportedImageTypeError.is(error)) {
              return new Response(error.message, { status: 415 })
            }

            if (ImageTooLargeError.is(error)) {
              return new Response(error.message, { status: 413 })
            }

            return new Response(error.message, { status: 502 })
          },
        })
      },
    },
  },
})
