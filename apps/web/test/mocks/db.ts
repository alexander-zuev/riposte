import type { UUIDv4 } from '@riposte/core'
import { vi } from 'vitest'

import { testEvent } from './messages'

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

export function createMockOutboxRow(id?: string, published = false) {
  const event = testEvent(id ? { id: id as UUIDv4 } : undefined)
  return {
    id: event.id,
    payload: event,
    createdAt: new Date(),
    publishedAt: published ? new Date() : null,
  }
}
