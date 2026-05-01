import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { drizzle } from 'drizzle-orm/d1'

import { config } from './config'
import type * as schema from './schema'

export type DatabaseConnection = DrizzleD1Database<typeof schema>

/**
 * Creates a Drizzle database connection.
 *
 * In HTTP context: d1 is a D1DatabaseSession (via withD1Session middleware)
 *   → reads route to nearest replica, writes always hit primary
 * In non-HTTP context (Workflows, queues): d1 is raw D1Database → all queries hit primary
 */
export function createDatabase(d1: D1Database): DatabaseConnection {
  return drizzle(d1, config)
}
