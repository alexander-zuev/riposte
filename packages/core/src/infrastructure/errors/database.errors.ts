import { TaggedError } from 'better-result'
import postgres from 'postgres'

type PostgresError = InstanceType<typeof postgres.PostgresError>
const { PostgresError } = postgres

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

export class DatabaseError extends TaggedError('DatabaseError')<{
  message: string
  cause: unknown
  retryable: boolean
  pg?: PostgresErrorMeta
}>() {
  constructor(args: { message: string; cause: unknown }) {
    const pg = extractPostgresMeta(args.cause)
    const retryable = pg ? !NON_RETRYABLE_PG_CLASSES.has(pg.code.slice(0, 2)) : true

    super({ message: args.message, cause: args.cause, retryable, pg })
  }
}
