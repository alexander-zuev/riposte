import { EntityNotFoundError, toServerFnRpc } from '@riposte/core'
import { isDevOrTestRuntime } from '@server/infrastructure/middleware/dev-only.middleware'
import { createServerFn } from '@tanstack/react-start'
import { Result } from 'better-result'

export const assertDevRouteAccess = createServerFn({ method: 'GET' }).handler(async () => {
  if (!isDevOrTestRuntime()) {
    return toServerFnRpc(Result.err(new EntityNotFoundError({ entity: 'Dev route' })))
  }

  return toServerFnRpc(Result.ok({ allowed: true }))
})
