import { FetchError, SearchError } from '@riposte/core'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import { Result } from 'better-result'

type JinaConfig = {
  apiKey: string
}

export type FetchUrlInput = {
  url: string
}

export type FetchUrlOutput = {
  url: string
  title: string
  content: string
  totalChars: number
}

export type WebSearchInput = {
  query: string
  numResults?: number
}

export type WebSearchResult = {
  title: string
  url: string
  description: string
  date?: string
}

export type WebSearchOutput = {
  results: WebSearchResult[]
}

export interface IJinaClient {
  fetchUrl: (input: FetchUrlInput) => Promise<Result<FetchUrlOutput, FetchError>>
  webSearch: (input: WebSearchInput) => Promise<Result<WebSearchOutput, SearchError>>
}

type JinaReaderResponse = {
  data?: {
    title?: string
    url?: string
    content?: string
  }
}

type JinaSearchResponse = {
  data?: Array<{
    title?: string
    url?: string
    description?: string
    date?: string
  }>
}

export class JinaClient implements IJinaClient {
  constructor(private readonly config: JinaConfig) {}

  async fetchUrl(input: FetchUrlInput): Promise<Result<FetchUrlOutput, FetchError>> {
    return Result.tryPromise(
      {
        try: async () => {
          const response = await fetch('https://r.jina.ai/', {
            method: 'POST',
            headers: {
              accept: 'application/json',
              authorization: `Bearer ${this.config.apiKey}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify({ url: input.url }),
          })

          if (!response.ok) throwHttpFailure(response.status)

          const body = await response.json()
          const content = body.data?.content ?? ''

          return {
            url: body.data?.url ?? input.url,
            title: body.data?.title ?? '',
            content,
            totalChars: content.length,
          }
        },
        catch: (cause) => toFetchError(cause, input.url),
      },
      RETRY.externalApi,
    )
  }

  async webSearch(input: WebSearchInput): Promise<Result<WebSearchOutput, SearchError>> {
    return Result.tryPromise(
      {
        try: async () => {
          const response = await fetch('https://s.jina.ai/', {
            method: 'POST',
            headers: {
              accept: 'application/json',
              authorization: `Bearer ${this.config.apiKey}`,
              'content-type': 'application/json',
              // Return SERP metadata only; consumer follows up with fetchUrl when content is needed.
              'x-respond-with': 'no-content',
            },
            body: JSON.stringify({ q: input.query }),
          })

          if (!response.ok) throwHttpFailure(response.status)

          const body = await response.json()
          const entries = body.data ?? []
          const limit = input.numResults ?? 5

          return {
            results: entries.slice(0, limit).flatMap((entry) => {
              if (!entry.title || !entry.url) return []
              return [
                {
                  title: entry.title,
                  url: entry.url,
                  description: entry.description ?? '',
                  ...(entry.date ? { date: entry.date } : {}),
                },
              ]
            }),
          }
        },
        catch: (cause) => toSearchError(cause),
      },
      RETRY.externalApi,
    )
  }
}

function toFetchError(cause: unknown, url: string): FetchError {
  const status = getHttpStatus(cause)
  return new FetchError({
    cause,
    url,
    status,
    retryable: status ? isRetryableStatus(status) : isTransientError(cause),
  })
}

function toSearchError(cause: unknown): SearchError {
  const status = getHttpStatus(cause)
  return new SearchError({
    cause,
    status,
    retryable: status ? isRetryableStatus(status) : isTransientError(cause),
  })
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500
}

function getHttpStatus(cause: unknown): number | undefined {
  if (
    typeof cause === 'object' &&
    cause !== null &&
    'status' in cause &&
    typeof cause.status === 'number'
  ) {
    return cause.status
  }
  return undefined
}

// Internal carrier — surfaces `response.status` from the `try` block to the
// `catch` so `toFetchError` / `toSearchError` can pick the right `retryable`.
// Not a TaggedError because it never crosses a function boundary.
function throwHttpFailure(status: number): never {
  const err = new Error(`Jina request failed with status ${status}`)
  Object.assign(err, { status })
  throw err
}
