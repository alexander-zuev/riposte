import type { Result } from '@riposte/core/client'
import { isServerError } from '@riposte/core/client'
import { createLogger } from '@riposte/core/client'
import { throwServerError } from '@web/lib/errors/client.errors'

const logger = createLogger('rpc')

export async function rpc<T>(fn: Promise<unknown>): Promise<T> {
  try {
    const raw = await fn
    const result = raw as Result<T>

    if (
      result === null ||
      result === undefined ||
      typeof result !== 'object' ||
      !('success' in result)
    ) {
      logger.error('rpc_malformed_response', {
        error: new TypeError('Server function did not return Result<T>'),
        rawType: raw === null ? 'null' : typeof raw,
        rawKeys:
          raw !== null && raw !== undefined && typeof raw === 'object'
            ? Object.keys(raw).join(',')
            : undefined,
        rawPreview: typeof raw === 'string' ? raw.slice(0, 200) : undefined,
      })
      throw new Error('Server returned an unexpected response')
    }

    return result.data
  } catch (error) {
    if (isServerError(error)) {
      logger.warn('rpc_server_error', { code: error.code })
      throwServerError(error)
    }
    throw error
  }
}
