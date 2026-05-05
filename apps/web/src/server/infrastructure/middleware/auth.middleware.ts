import { AuthenticationError, InternalServerError } from '@riposte/core'
import { createLogger } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { Result } from 'better-result'

import { getAuthInstance } from '../auth'
import type { Session, User } from '../auth/types'

const logger = createLogger('auth-middleware')

export interface AuthContext {
  user?: User
  session?: Session
}

export interface RequiredAuthContext {
  user: User
  session: Session
}

export const extractAuth = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const headers = getRequestHeaders()
  const auth = getAuthInstance()

  const session = await Result.tryPromise<
    { user: User; session: Session } | null,
    InternalServerError
  >({
    try: async () => auth.api.getSession({ headers }),
    catch: (e) => {
      logger.error('Failed to get session', { error: e })
      return new InternalServerError()
    },
  })

  const resolved = session.isOk() ? session.value : null
  if (resolved) Sentry.setUser({ id: resolved.user.id })

  return next({
    context: { user: resolved?.user, session: resolved?.session },
  })
})

export const requireAuth = createMiddleware({ type: 'function' })
  .middleware([extractAuth])
  .server(async ({ next, context }) => {
    if (!context?.user || !context?.session) {
      throw new AuthenticationError()
    }

    return next({ context: { user: context.user, session: context.session } })
  })
