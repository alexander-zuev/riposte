import { createAppDeps } from '@server/infrastructure/app-deps'
import { createMiddleware } from '@tanstack/react-start'
import { env, waitUntil } from 'cloudflare:workers'

const createDeps = () => createAppDeps(env, { waitUntil })

export const withDeps = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  return next({ context: { deps: createDeps() } })
})

export const withDepsRequest = createMiddleware().server(async ({ next }) => {
  return next({ context: { deps: createDeps() } })
})
