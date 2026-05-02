/**
 * Centralized database mocks for unit tests
 *
 * Mocks Drizzle's chainable query builder and transaction API.
 * Hyperdrive/Postgres isn't simulated by CF vitest pool, so we must mock.
 */
import { vi } from 'vitest'

export interface MockTransaction {
  // SELECT chain
  select: ReturnType<typeof vi.fn>
  from: ReturnType<typeof vi.fn>
  where: ReturnType<typeof vi.fn>
  orderBy: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  for: ReturnType<typeof vi.fn>
  // UPDATE chain
  update: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  // INSERT chain
  insert: ReturnType<typeof vi.fn>
  values: ReturnType<typeof vi.fn>
  returning: ReturnType<typeof vi.fn>
}

export interface MockDatabase {
  transaction: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

/**
 * Creates a mock transaction with chainable query builder
 * Default: all queries return empty arrays
 */
export function createMockTx(): MockTransaction {
  const tx: MockTransaction = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    for: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
    set: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn().mockResolvedValue([]),
  }

  // Wire up SELECT chain: select().from().where().orderBy().limit().for()
  tx.select.mockReturnValue(tx)
  tx.from.mockReturnValue(tx)
  tx.where.mockReturnValue(tx)
  tx.orderBy.mockReturnValue(tx)
  tx.limit.mockReturnValue(tx)

  // Wire up UPDATE chain: update().set().where()
  tx.update.mockReturnValue(tx)
  tx.set.mockReturnValue(tx)

  // Wire up INSERT chain: insert().values().returning()
  tx.insert.mockReturnValue(tx)
  tx.values.mockReturnValue(tx)

  return tx
}

/**
 * Creates a mock database that executes transaction callbacks
 */
export function createMockDb(tx: MockTransaction): MockDatabase {
  return {
    transaction: vi.fn(async (callback: (tx: MockTransaction) => Promise<unknown>) => {
      return callback(tx)
    }),
    select: tx.select,
    insert: tx.insert,
    update: tx.update,
  }
}

/**
 * Helper to create mock outbox rows
 */
export function createMockOutboxRow(id: string, eventName: string, processed = false) {
  return {
    id,
    payload: { type: 'event' as const, name: eventName, data: {} },
    createdAt: new Date(),
    publishedAt: processed ? new Date() : null,
  }
}
