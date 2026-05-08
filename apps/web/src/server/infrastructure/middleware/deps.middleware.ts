import { createAppDeps } from '@server/infrastructure/app-deps'
import { createMiddleware } from '@tanstack/react-start'
import { env, waitUntil } from 'cloudflare:workers'

export const withDeps = createMiddleware().server(async ({ next }) => {
  const deps = createAppDeps(env, { waitUntil })
  return next({ context: { deps } })
})
