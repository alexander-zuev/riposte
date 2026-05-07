import { KVError } from '@riposte/core'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import { Result } from 'better-result'

import type { SecondaryStorage } from '../auth/storage'

export class KVClient {
  constructor(private readonly kv: KVNamespace) {}

  async get(key: string): Promise<Result<string | null, KVError>> {
    return Result.tryPromise(
      {
        try: async () => this.kv.get(key),
        catch: (cause) =>
          new KVError({ operation: 'get', key, cause, retryable: isTransientError(cause) }),
      },
      RETRY.transient,
    )
  }

  async put(
    key: string,
    value: string,
    options?: { ttl?: number },
  ): Promise<Result<void, KVError>> {
    const kvOptions: KVNamespacePutOptions = {}
    if (options?.ttl && options.ttl > 0) {
      kvOptions.expirationTtl = options.ttl
    }

    return Result.tryPromise(
      {
        try: async () => this.kv.put(key, value, kvOptions),
        catch: (cause) =>
          new KVError({ operation: 'put', key, cause, retryable: isTransientError(cause) }),
      },
      RETRY.transient,
    )
  }

  async delete(key: string): Promise<Result<void, KVError>> {
    return Result.tryPromise(
      {
        try: async () => this.kv.delete(key),
        catch: (cause) =>
          new KVError({ operation: 'delete', key, cause, retryable: isTransientError(cause) }),
      },
      RETRY.transient,
    )
  }

  asSecondaryStorage(): SecondaryStorage {
    return {
      get: async (key) => {
        const result = await this.get(key)
        if (result.isErr()) throw result.error
        return result.value
      },
      set: async (key, value, ttl) => {
        const result = await this.put(key, value, { ttl })
        if (result.isErr()) throw result.error
      },
      delete: async (key) => {
        const result = await this.delete(key)
        if (result.isErr()) throw result.error
      },
    }
  }
}
