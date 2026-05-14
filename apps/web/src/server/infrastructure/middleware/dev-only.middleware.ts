import { createMiddleware } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'

export function isDevOrTestRuntime(): boolean {
  const mode: string = env.ENV

  return mode === 'development' || mode === 'test'
}

export function devOnlyNotFoundResponse(): Response {
  return new Response('Not found', { status: 404 })
}

export function requireDevOrTestRuntime(): void {
  if (!isDevOrTestRuntime()) throw devOnlyNotFoundResponse()
}

export const devOnlyFunctionMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    requireDevOrTestRuntime()

    return next()
  },
)

export const devOnlyRequestMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ next }) => {
    if (!isDevOrTestRuntime()) return devOnlyNotFoundResponse()

    return next()
  },
)
