import {
  AuthenticationError,
  InternalServerError,
  createLogger,
  toServerFnRpc,
} from '@riposte/core'

const logger = createLogger('auth.fn')
import { getAuthInstance } from '@server/infrastructure/auth/auth'
import type { Session, User } from '@server/infrastructure/auth/types'
import { createServerFn } from '@tanstack/react-start'
import { getCookie, getRequestHeaders } from '@tanstack/react-start/server'
import { Result } from 'better-result'

type AuthSession = { session: Session; user: User } | null
const LAST_LOGIN_METHOD_COOKIE = 'better-auth.last_used_login_method'

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const headers = getRequestHeaders()
  const auth = getAuthInstance()

  const result = await Result.tryPromise<AuthSession, InternalServerError>({
    try: async () => auth.api.getSession({ headers }),
    catch: (e) => {
      logger.error('Failed to get session', { error: e })
      return new InternalServerError()
    },
  })

  return toServerFnRpc(result)
})

export const ensureSession = createServerFn({ method: 'GET' }).handler(async () => {
  const headers = getRequestHeaders()
  const auth = getAuthInstance()

  const sessionResult = await Result.tryPromise<AuthSession, InternalServerError>({
    try: async () => auth.api.getSession({ headers }),
    catch: (e) => {
      logger.error('Failed to ensure session', { error: e })
      return new InternalServerError()
    },
  })
  const result = sessionResult.andThen((session) =>
    session ? Result.ok(session) : Result.err(new AuthenticationError()),
  )

  return toServerFnRpc(result)
})

export const getLastLoginMethod = createServerFn({ method: 'GET' }).handler(async () => {
  return getCookie(LAST_LOGIN_METHOD_COOKIE) ?? null
})
