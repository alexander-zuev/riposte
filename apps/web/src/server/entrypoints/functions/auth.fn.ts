import { AuthenticationError } from '@riposte/core/client'
import { getAuthInstance } from '@server/infrastructure/auth/auth'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const headers = getRequestHeaders()
  const auth = getAuthInstance()
  return await auth.api.getSession({ headers })
})

// No try/catch — errorMiddleware is the single logging point. Just throw.
export const ensureSession = createServerFn({ method: 'GET' }).handler(async () => {
  const headers = getRequestHeaders()
  const auth = getAuthInstance()
  const session = await auth.api.getSession({ headers })

  if (!session) {
    throw new AuthenticationError()
  }

  return session
})
