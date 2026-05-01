import type { RateLimit } from './types'

export interface SecondaryStorage {
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string, ttl?: number) => Promise<void>
  delete: (key: string) => Promise<void>
}

export interface RateLimitStorage {
  get: (key: string) => Promise<RateLimit | undefined>
  set: (key: string, value: RateLimit) => Promise<void>
}

export function createKVStorage(kv: KVNamespace): SecondaryStorage {
  return {
    async get(key: string): Promise<string | null> {
      return await kv.get(key)
    },

    async set(key: string, value: string, ttl?: number): Promise<void> {
      const options: KVNamespacePutOptions = {}

      if (ttl && ttl > 0) {
        options.expirationTtl = ttl
      }

      await kv.put(key, value, options)
    },

    async delete(key: string): Promise<void> {
      await kv.delete(key)
    },
  }
}

export function createRateLimitStorage(
  doNamespace: DurableObjectNamespace,
  debug = false,
): RateLimitStorage {
  return {
    async get(key: string): Promise<RateLimit | undefined> {
      const start = Date.now()

      try {
        const doId = doNamespace.idFromName(key)
        const stub = doNamespace.get(doId) as any
        const data = await stub.getRateLimit()

        if (debug && data) {
          console.log(`[RateLimit] GET ${key}: count=${data.count} (${Date.now() - start}ms)`)
        }

        return data
      } catch (error) {
        if (debug) console.error(`[RateLimit] GET ${key} ERROR:`, error)
        return undefined
      }
    },

    async set(key: string, value: RateLimit): Promise<void> {
      const start = Date.now()

      try {
        const doId = doNamespace.idFromName(key)
        const stub = doNamespace.get(doId) as any
        await stub.setRateLimit(value)

        if (debug) {
          console.log(`[RateLimit] SET ${key}: count=${value.count} (${Date.now() - start}ms)`)
        }
      } catch (error) {
        if (debug) console.error(`[RateLimit] SET ${key} ERROR:`, error)
        throw error
      }
    },
  }
}
