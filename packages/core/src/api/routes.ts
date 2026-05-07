/**
 * App Routes Configuration
 *
 * Centralized definition of all application routes with proper typing.
 * Used by worker, frontend, and API clients for consistency.
 */

export const APP_ROUTES = {
  auth: {
    basePath: '/api/auth',
  },
  routes: {
    cache: {
      images: '/api/cache/images',
    },
  },
} as const

export function buildImageProxyUrl(baseUrl: string, externalUrl: string | null): string | null {
  if (!externalUrl) return null

  const params = new URLSearchParams({ url: externalUrl })
  return `${baseUrl}${APP_ROUTES.routes.cache.images}?${params.toString()}`
}
