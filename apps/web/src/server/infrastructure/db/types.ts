import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import type * as schema from './schema'

export type DrizzleDb = PostgresJsDatabase<typeof schema>

export interface DbEnv {
  HYPERDRIVE: Hyperdrive
  ENV: string
}
