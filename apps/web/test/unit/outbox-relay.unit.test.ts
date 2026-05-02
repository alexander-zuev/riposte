import type { IOutboxRepository } from '@server/domain/repository/interfaces'
import { OutboxRelay } from '@server/infrastructure/queues/outbox-relay'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MockDatabase } from '../mocks'
import {
  createMockDb,
  createMockEnv,
  createMockOutboxRow,
  createMockQueueService,
  createMockTx,
} from '../mocks'

const mockQueueClient = createMockQueueService()
vi.mock('@server/infrastructure/queues/queue-client', () => ({
  QueueClient: vi.fn(function () {
    return mockQueueClient
  }),
}))

const mockOutboxRepo: IOutboxRepository = {
  persistEvents: vi.fn().mockResolvedValue(undefined),
  assertMessageNotProcessed: vi.fn().mockResolvedValue(undefined),
  retrievePending: vi.fn().mockResolvedValue([]),
  publishPending: vi.fn().mockResolvedValue([]),
}
vi.mock('@server/infrastructure/repositories/outbox.repository', () => ({
  OutboxRepository: vi.fn(function () {
    return mockOutboxRepo
  }),
}))

describe.sequential('OutboxRelay', () => {
  let db: MockDatabase
  let env: Env
  let relay: OutboxRelay

  beforeEach(() => {
    vi.clearAllMocks()

    const tx = createMockTx()
    db = createMockDb(tx)
    env = createMockEnv()

    relay = new OutboxRelay(db as any)

    mockQueueClient.sendBatch.mockResolvedValue(undefined)

    vi.mocked(mockOutboxRepo.retrievePending).mockResolvedValue([])
    vi.mocked(mockOutboxRepo.publishPending).mockResolvedValue([])
  })

  describe('flush()', () => {
    it('returns 0 when outbox is empty', async () => {
      const result = await relay.flush(env)

      expect(result).toBe(0)
      expect(db.transaction).toHaveBeenCalled()
      expect(mockQueueClient.sendBatch).not.toHaveBeenCalled()
    })

    it('processes single pending event', async () => {
      const row = createMockOutboxRow()
      vi.mocked(mockOutboxRepo.retrievePending).mockResolvedValue([row])
      vi.mocked(mockOutboxRepo.publishPending).mockResolvedValue([row.id])

      const result = await relay.flush(env)

      expect(result).toBe(1)
      expect(mockQueueClient.sendBatch).toHaveBeenCalledTimes(1)
    })

    it('processes batch of events up to limit', async () => {
      const rows = Array.from({ length: 5 }, () => createMockOutboxRow())
      vi.mocked(mockOutboxRepo.retrievePending).mockResolvedValue(rows)
      vi.mocked(mockOutboxRepo.publishPending).mockResolvedValue(rows.map((r) => r.id))

      const result = await relay.flush(env, 5)

      expect(result).toBe(5)
      expect(mockOutboxRepo.retrievePending).toHaveBeenCalledWith(5)
    })

    it('marks events as processed after queue send', async () => {
      const row = createMockOutboxRow()
      vi.mocked(mockOutboxRepo.retrievePending).mockResolvedValue([row])
      vi.mocked(mockOutboxRepo.publishPending).mockResolvedValue([row.id])

      await relay.flush(env)

      expect(mockOutboxRepo.publishPending).toHaveBeenCalledWith([row])
    })

    it('respects custom batch size', async () => {
      await relay.flush(env, 100)

      expect(mockOutboxRepo.retrievePending).toHaveBeenCalledWith(100)
    })

    it('uses default batch size of 50', async () => {
      await relay.flush(env)

      expect(mockOutboxRepo.retrievePending).toHaveBeenCalledWith(50)
    })

    it('throws on queue failure (tx rolls back)', async () => {
      const row = createMockOutboxRow()
      vi.mocked(mockOutboxRepo.retrievePending).mockResolvedValue([row])
      mockQueueClient.sendBatch.mockRejectedValue(new Error('Queue unavailable'))

      await expect(relay.flush(env)).rejects.toThrow('Queue unavailable')
    })
  })
})
