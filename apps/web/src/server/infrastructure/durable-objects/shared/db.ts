import { drizzle, type DrizzleSqliteDODatabase } from 'drizzle-orm/durable-sqlite'

export function createDODatabase(ctx: DurableObjectState): DrizzleSqliteDODatabase {
  return drizzle(ctx.storage, { casing: 'snake_case', logger: false })
}
