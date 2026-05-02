import { createLogger } from '@riposte/core'
import { createMiddleware } from '@tanstack/react-start'

const logger = createLogger('server-fn')

/**
 * Server function logging middleware
 *
 * Logs request metadata: fn, requestId, method, duration, status
 * Does NOT log error details - Worker handles that.
 */
export const loggingMiddleware = createMiddleware({ type: 'function' }).server(async (arg) => {
  const { next, method, serverFnMeta } = arg
  const fn = serverFnMeta?.name ?? 'unknown'
  const requestId = crypto.randomUUID().slice(0, 8)
  const startTime = performance.now()

  try {
    const result = await next({ context: { requestId } })
    const duration = Math.round(performance.now() - startTime)
    logger.debug(fn, { requestId, method, duration, status: 'ok' })
    return result
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)
    logger.debug(fn, { requestId, method, duration, status: 'error' })
    throw error
  }
})
