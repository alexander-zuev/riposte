import type { QueryClientConfig } from '@tanstack/react-query'
import { QueryClient } from '@tanstack/react-query'

const MAX_RETRIES = 3

export function isRetryableError(error: unknown): boolean {
  if (!isRecord(error)) return false

  // Backend errors with retryable property (from fromServerError)
  if ('retryable' in error && typeof error.retryable === 'boolean') {
    return error.retryable
  }

  if (error.name === 'AbortError') return true // Timeout/abort

  const { status } = error
  return typeof status === 'number' && status >= 500 && status < 600
}

function retryPolicy(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_RETRIES && isRetryableError(error)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * staleTime Guidance (TkDodo - https://tkdodo.eu/blog/practical-react-query)
 *
 * staleTime is domain-specific — set per-query, not globally.
 * Only stale queries refetch on window focus/mount/reconnect.
 *
 * | Data Type           | staleTime   | Why                              |
 * |---------------------|-------------|----------------------------------|
 * | Collaborative/live  | 0 - 30s     | Multiple users, needs freshness  |
 * | Lists/collections   | 30s - 1min  | Moderate freshness               |
 * | User data           | 5min        | Rarely changes mid-session       |
 * | Config/static       | Infinity    | Only invalidate on user action   |
 *
 * Default: 0 (always stale). Override in queryOptions() per hook.
 */
export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // staleTime: Intentionally not set. Manage per-query based on data type.
      gcTime: 1000 * 60 * 15, // 15 minutes - keep unused data in cache
      refetchOnWindowFocus: true, // Core feature - refetches STALE data when user returns
      refetchOnReconnect: true,
      retry: retryPolicy,
      retryDelay: (attempt) => Math.min(attempt > 1 ? 2 ** attempt * 1000 : 1000, 30 * 1000),
    },
    mutations: {
      /**
       * retry: How many times React Query should retry a failed mutation.
       * Recommendation: 0 (default). Mutations often have side effects, so
       * automatic retries can be dangerous (e.g., creating duplicate resources).
       * Handle mutation retries manually if needed.
       */
      retry: 0,
    },
  },
}

export function createQueryClient() {
  return new QueryClient(queryClientConfig)
}
