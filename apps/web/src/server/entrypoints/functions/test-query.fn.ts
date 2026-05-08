import {
  AuthenticationError,
  AuthorizationError,
  EntityNotFoundError,
  InternalServerError,
  QueueError,
  RateLimitError,
  toServerFnRpc,
  ValidationError,
} from '@riposte/core'
import { createServerFn } from '@tanstack/react-start'
import { Result } from 'better-result'
import { z } from 'zod'

export const testQueryKindSchema = z.enum([
  'success',
  'database-retryable',
  'database-non-retryable',
  'queue-retryable',
  'queue-non-retryable',
  'internal',
  'validation',
  'auth',
  'authorization',
  'not-found',
  'rate-limit',
  'throw-error',
])

export type TestQueryKind = z.infer<typeof testQueryKindSchema>

const testQueryInputSchema = z.object({
  kind: testQueryKindSchema,
})

export const runTestQuery = createServerFn({ method: 'GET' })
  .inputValidator(testQueryInputSchema)
  .handler(async ({ data }) => {
    switch (data.kind) {
      case 'success':
        return toServerFnRpc(
          Result.ok({
            message: 'ok',
            servedAt: new Date().toISOString(),
          }),
        )
      case 'database-retryable':
        return toServerFnRpc(
          Result.err(
            createDatabaseTestError({
              message: 'Retryable database failure',
              retryable: true,
              code: '40001',
            }),
          ),
        )
      case 'database-non-retryable':
        return toServerFnRpc(
          Result.err(
            createDatabaseTestError({
              message: 'Non-retryable database failure',
              retryable: false,
              code: '23505',
            }),
          ),
        )
      case 'queue-retryable':
        return toServerFnRpc(
          Result.err(
            new QueueError({
              message: 'Retryable queue failure',
              cause: {},
              retryable: true,
            }),
          ),
        )
      case 'queue-non-retryable':
        return toServerFnRpc(
          Result.err(
            new QueueError({
              message: 'Non-retryable queue failure',
              cause: {},
              retryable: false,
            }),
          ),
        )
      case 'internal':
        return toServerFnRpc(Result.err(new InternalServerError()))
      case 'validation':
        return toServerFnRpc(
          Result.err(
            new ValidationError({
              issues: [{ code: 'custom', path: ['field'], message: 'Invalid test input' }],
            }),
          ),
        )
      case 'auth':
        return toServerFnRpc(Result.err(new AuthenticationError()))
      case 'authorization':
        return toServerFnRpc(Result.err(new AuthorizationError()))
      case 'not-found':
        return toServerFnRpc(Result.err(new EntityNotFoundError({ entity: 'Test entity' })))
      case 'rate-limit':
        return toServerFnRpc(Result.err(new RateLimitError()))
      case 'throw-error':
        throw new Error('Plain thrown server error')
      default: {
        throw new Error('Unhandled test query kind')
      }
    }
  })

function createDatabaseTestError(input: { message: string; retryable: boolean; code: string }) {
  return {
    _tag: 'DatabaseError' as const,
    name: 'DatabaseError',
    message: input.message,
    cause: {},
    retryable: input.retryable,
    pg: {
      code: input.code,
      severity: 'ERROR',
    },
  }
}
