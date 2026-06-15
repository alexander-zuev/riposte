import { DOUnreachableError } from '@riposte/core'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import { Result } from 'better-result'

export interface IDurableObjectRpc {
  call: <T>(operation: () => Promise<T>) => Promise<Result<T, DOUnreachableError>>
}

export class DurableObjectRpc implements IDurableObjectRpc {
  async call<T>(operation: () => Promise<T>): Promise<Result<T, DOUnreachableError>> {
    return await Result.tryPromise(
      {
        try: operation,
        catch: (cause) =>
          new DOUnreachableError({
            cause,
            retryable: isTransientError(cause),
          }),
      },
      RETRY.transient,
    )
  }
}
