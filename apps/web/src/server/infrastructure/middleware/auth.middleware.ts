import { AuthenticationError, InternalServerError } from '@riposte/core'
import { createLogger } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import type { AppDeps } from '@server/infrastructure/app-deps'
import { getAuthInstance } from '@server/infrastructure/auth'
import type { Session, User } from '@server/infrastructure/auth/types'
import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { Result } from 'better-result'

const logger = createLogger('auth-middleware')

export interface AuthContext {
  user?: User
  session?: Session
}

export interface RequiredAuthContext {
  user: User
  session: Session
}

async function resolveAuth(deps: AppDeps): Promise<{ user: User; session: Session } | null> {
  const headers = getRequestHeaders()
  const auth = getAuthInstance(deps)

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

  return resolved
}

export const extractAuth = createMiddleware().server(async ({ context, next }) => {
  const resolved = await resolveAuth(context.deps)
  return next({
    context: { user: resolved?.user, session: resolved?.session },
  })
})

export const extractAuthFunction = createMiddleware({ type: 'function' }).server(
  async ({ context, next }) => {
    const resolved = await resolveAuth(context.deps)
    return next({
      context: { user: resolved?.user, session: resolved?.session },
    })
  },
)

export const requireAuth = createMiddleware()
  .middleware([extractAuth])
  .server(async ({ next, context }) => {
    if (!context?.user || !context?.session) {
      throw new AuthenticationError()
    }

    return next({ context: { user: context.user, session: context.session } })
  })
