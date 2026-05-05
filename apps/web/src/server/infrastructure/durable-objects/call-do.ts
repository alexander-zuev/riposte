import { DOUnreachableError } from '@riposte/core'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import { Result } from 'better-result'

export async function callDo<T>(call: () => Promise<T>): Promise<Result<T, DOUnreachableError>> {
  return Result.tryPromise(
    {
      try: call,
      catch: (cause) =>
        new DOUnreachableError({
          cause,
          retryable: isTransientError(cause),
        }),
    },
    RETRY.transient,
  )
}
