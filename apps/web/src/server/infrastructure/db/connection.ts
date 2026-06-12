import type { DrizzleConfig } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

export const config = {
  casing: 'snake_case',
  logger: false,
  schema,
} satisfies DrizzleConfig<typeof schema>

export function createDatabase(env: Env): DrizzleDb {
  const client = postgres(env.HYPERDRIVE.connectionString, {
    max: 5,
    prepare: true,
    fetch_types: false,
  })
  return drizzle(client, config)
}

export type DrizzleDb = PostgresJsDatabase<typeof schema>

declare const txBrand: unique symbol

/** The handle Drizzle passes to a `db.transaction(...)` callback. */
type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0]

/**
 * Transaction-scoped handle. Domain repositories accept only `Tx`, so aggregate writes
 * cannot bypass the UoW (claim + version guard + outbox). Minted exclusively by
 * `brandTx` at transaction boundaries: `executeUoW` and machinery that opens its own
 * transaction (outbox relay, test setup).
 */
export type Tx = DrizzleTx & { readonly [txBrand]: true }

/**
 * Read capability: select-only by construction (no insert/update/delete/transaction/execute).
 * What `deps.readDb()` exposes — query handlers get CQRS-lite enforced for free.
 */
export type ReadDb = Pick<DrizzleDb, 'select' | 'selectDistinct' | 'query'>

/** Call only where a real Drizzle transaction begins. Every call site is a minting site — keep the list short. */
export function brandTx(tx: DrizzleTx): Tx {
  return tx as Tx
}

/**
 * TRANSITIONAL: lets legacy read paths build repositories on the root handle.
 * Repo finders in query handlers are queries in disguise — banned as destination;
 * move the SQL into the query handler when touched. Every call site is migration debt:
 * `rg "transitionalRepoRead"` is the worklist.
 */
export function transitionalRepoRead(db: ReadDb): Tx {
  return db as unknown as Tx
}
