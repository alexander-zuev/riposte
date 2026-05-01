import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { config } from './config'
import type { DbEnv, DrizzleDb } from './types'

export function createDatabase(env: DbEnv): DrizzleDb {
  const client = postgres(env.HYPERDRIVE.connectionString, {
    max: 5,
    prepare: false,
    fetch_types: false,
  })
  return drizzle(client, {
    ...config,
    logger: false,
  })
}
