import postgres from 'postgres'

import { InfrastructureError } from './base.errors'

type PostgresError = InstanceType<typeof postgres.PostgresError>
const { PostgresError } = postgres

export class DuplicateMessageError extends InfrastructureError {
  constructor(public readonly messageId: string) {
    super(`Duplicate message: ${messageId}`)
  }
}

/* -------------------------------------------------------------------------------------------------
 * Postgres error metadata
 *
 * Drizzle wraps postgres.js errors as DrizzleQueryError with the original
 * PostgresError in .cause. We extract structured SQLSTATE metadata from .cause
 * to enable smart retry decisions and structured logging.
 *
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 * ----------------------------------------------------------------------------------------------- */

export interface PostgresErrorMeta {
  code: string
  severity: string
  constraint?: string
  table?: string
  column?: string
  detail?: string
  hint?: string
}

const NON_RETRYABLE_PG_CLASSES = new Set([
  '22', // Data exception (bad input, overflow, invalid text representation)
  '23', // Integrity constraint violation (unique, fk, check, not-null)
  '25', // Invalid transaction state
  '28', // Invalid authorization specification
  '2F', // SQL routine exception
  '42', // Syntax error or access rule violation (undefined table/column, bad SQL)
])

function findPostgresError(cause: unknown): PostgresError | undefined {
  if (cause instanceof PostgresError) return cause
  if (cause instanceof Error && cause.cause instanceof PostgresError) return cause.cause
  return undefined
}

function extractPostgresMeta(cause: unknown): PostgresErrorMeta | undefined {
  const pg = findPostgresError(cause)
  if (!pg) return undefined

  return {
    code: pg.code,
    severity: pg.severity,
    constraint: pg.constraint_name,
    table: pg.table_name,
    column: pg.column_name,
    detail: pg.detail,
    hint: pg.hint,
  }
}

export class DatabaseError extends InfrastructureError {
  override retryable: boolean
  readonly pg?: PostgresErrorMeta

  constructor(message: string, cause?: unknown) {
    super(message)
    if (cause !== undefined) this.cause = cause

    this.pg = cause !== undefined ? extractPostgresMeta(cause) : undefined
    this.retryable = this.pg ? !NON_RETRYABLE_PG_CLASSES.has(this.pg.code.slice(0, 2)) : true
  }
}
