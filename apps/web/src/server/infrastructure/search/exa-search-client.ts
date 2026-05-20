import { SearchError } from '@riposte/core'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import { Result } from 'better-result'

type ExaSearchConfig = {
  apiKey: string
}

export type SearchWebInput = {
  query: string
  numResults?: number
}

export type SearchWebResult = {
  title: string
  url: string
  highlights: string[]
  publishedDate?: string
}

export type SearchWebOutput = {
  requestId: string
  results: SearchWebResult[]
  searchTimeMs?: number
}

export interface IWebSearchClient {
  search: (input: SearchWebInput) => Promise<Result<SearchWebOutput, SearchError>>
}

type ExaSearchResponse = {
  requestId: string
  results: Array<{
    title?: string
    url?: string
    highlights?: string[]
    publishedDate?: string
  }>
  searchTime?: number
}

export class ExaSearchClient implements IWebSearchClient {
  constructor(private readonly config: ExaSearchConfig) {}

  async search(input: SearchWebInput): Promise<Result<SearchWebOutput, SearchError>> {
    return Result.tryPromise(
      {
        try: async () => {
          const response = await fetch('https://api.exa.ai/search', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-api-key': this.config.apiKey,
            },
            body: JSON.stringify({
              query: input.query,
              type: 'auto',
              numResults: input.numResults ?? 5,
              highlights: {
                numSentences: 8,
              },
            }),
          })

          if (!response.ok) {
            throw new HttpStatusError(response.status)
          }

          const body = (await response.json()) as ExaSearchResponse

          return {
            requestId: body.requestId,
            results: body.results.flatMap((result) => {
              if (!result.title || !result.url) return []
              return [
                {
                  title: result.title,
                  url: result.url,
                  highlights: result.highlights ?? [],
                  ...(result.publishedDate ? { publishedDate: result.publishedDate } : {}),
                },
              ]
            }),
            ...(body.searchTime !== undefined ? { searchTimeMs: body.searchTime } : {}),
          }
        },
        catch: (cause) => toSearchError(cause),
      },
      RETRY.externalApi,
    )
  }
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

class HttpStatusError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Search failed with status ${status}`)
    this.name = 'HttpStatusError'
    this.status = status
  }
}
