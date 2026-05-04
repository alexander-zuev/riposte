import { AuthenticationError, InternalServerError } from '@riposte/core'
import { serializeForRpc } from '@server/entrypoints/functions/rpc-result'
import { getAuthInstance } from '@server/infrastructure/auth/auth'
import type { Session, User } from '@server/infrastructure/auth/types'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { Result } from 'better-result'

type AuthSession = { session: Session; user: User } | null

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const headers = getRequestHeaders()
  const auth = getAuthInstance()

  const result = await Result.tryPromise<AuthSession, InternalServerError>({
    try: async () => auth.api.getSession({ headers }),
    catch: () => new InternalServerError(),
  })

  return serializeForRpc(result)
})

export const ensureSession = createServerFn({ method: 'GET' }).handler(async () => {
  const headers = getRequestHeaders()
  const auth = getAuthInstance()

  const sessionResult = await Result.tryPromise<AuthSession, InternalServerError>({
    try: async () => auth.api.getSession({ headers }),
    catch: () => new InternalServerError(),
  })
  const result = sessionResult.andThen((session) =>
    session ? Result.ok(session) : Result.err(new AuthenticationError()),
  )

  return serializeForRpc(result)
})
