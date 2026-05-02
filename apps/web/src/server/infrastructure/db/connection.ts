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

export function createDatabase(env: DbEnv): DrizzleDb {
  const client = postgres(env.HYPERDRIVE.connectionString, {
    max: 5,
    prepare: true,
    fetch_types: false,
  })
  return drizzle(client, config)
}

export type DrizzleDb = PostgresJsDatabase<typeof schema>

export interface DbEnv {
  HYPERDRIVE: Hyperdrive
  ENV: string
}
