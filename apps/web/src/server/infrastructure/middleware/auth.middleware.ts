import { AuthenticationError } from '@riposte/core'
import { createLogger } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

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
  let user: User | undefined
  let session: Session | undefined

  try {
    const headers = getRequestHeaders()
    const auth = getAuthInstance()
    const result = await auth.api.getSession({ headers })
    user = result?.user
    session = result?.session
  } catch (error) {
    logger.error('Failed to get session', { error })
  }

  if (user) Sentry.setUser({ id: user.id })

  return next({ context: { user, session } })
})

export const requireAuth = createMiddleware({ type: 'function' })
  .middleware([extractAuth])
  .server(async ({ next, context }) => {
    if (!context?.user || !context?.session) {
      throw new AuthenticationError()
    }

    return next({ context: { user: context.user, session: context.session } })
  })
