type RetryConfig = {
  retry: {
    times: number
    delayMs: number
    backoff: 'linear' | 'constant' | 'exponential'
    shouldRetry?: (error: any) => boolean
  }
}

const TRANSIENT_ERROR_PATTERNS = [
  /network/,
  /fetch failed/,
  /timeout/,
  /timed?\s*out/,
  /connection.*(lost|reset|refused|closed|aborted)/,
  /econnreset/,
  /econnrefused/,
  /etimedout/,
  /eai_again/,
]

function hasBooleanProp(
  value: unknown,
  prop: 'retryable' | 'overloaded',
  expected: boolean,
): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    prop in value &&
    (value as Record<typeof prop, unknown>)[prop] === expected
  )
}

function hasErrorName(value: unknown, name: string): boolean {
  return typeof value === 'object' && value !== null && 'name' in value && value.name === name
}

// Identifies transient I/O errors worth retrying across Workers bindings, fetch,
// and SDKs before a boundary has a more specific typed error.
export function isTransientError(cause: unknown): boolean {
  if (hasBooleanProp(cause, 'overloaded', true)) return false
  if (hasBooleanProp(cause, 'retryable', true)) return true
  if (hasErrorName(cause, 'AbortError')) return true

  if (cause instanceof Error) {
    const msg = cause.message.toLowerCase()
    return TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(msg))
  }

  return false
}

// Short retry window for internal Cloudflare bindings (KV, DO, Queue).
// These are in-datacenter calls: catch brief blips, leave longer outages to platform orchestration.
const transient: RetryConfig = {
  retry: {
    times: 3,
    delayMs: 25,
    backoff: 'exponential',
    shouldRetry: (e) => e.retryable === true,
  },
}

// DB operations — retry on transient SQLSTATE (deadlock, connection reset).
// DatabaseError.retryable is computed from SQLSTATE class.
const database: RetryConfig = {
  retry: {
    times: 2,
    delayMs: 50,
    backoff: 'exponential',
    shouldRetry: (e) => e.retryable === true,
  },
}

// External APIs (Stripe, AI, third-party). Higher latency, use backoff.
const externalApi: RetryConfig = {
  retry: {
    times: 2,
    delayMs: 200,
    backoff: 'exponential',
    shouldRetry: (e) => e.retryable === true,
  },
}

export const RETRY = { transient, database, externalApi } as const
