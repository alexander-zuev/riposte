import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createMockEnv,
  createMockCtx,
  mockAssertMessageNotProcessed,
  mockPersistEvents,
  mockOutboxRepositoryModule,
  testEvent,
} from '../mocks'

const mockTransaction = vi.fn()

vi.mock('@server/infrastructure/db/connection', () => ({
  createDatabase: () => ({ transaction: mockTransaction }),
}))

vi.mock('@server/infrastructure/durable-objects/outbox-relay-do', () => ({
  OUTBOX_RELAY_ID: 'relay',
}))

vi.mock('@server/infrastructure/repositories/outbox.repository', () => mockOutboxRepositoryModule())

import { executeUoW } from '@server/application/message-bus/unit-of-work'
import { registerEvents } from '@server/infrastructure/context/event-context'

describe.sequential('executeUoW', () => {
  let env: Env
  let ctx: ExecutionContext

  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(async (callback) => callback({}))
    env = createMockEnv()
    ctx = createMockCtx()
  })

  describe('core behavior', () => {
    it('wraps work in event context and transaction', async () => {
      const work = vi.fn().mockResolvedValue('result')

      await executeUoW(env, ctx, work)

      expect(mockTransaction).toHaveBeenCalledWith(expect.any(Function))
      expect(work).toHaveBeenCalled()
    })

    it('returns work result', async () => {
      const work = vi.fn().mockResolvedValue({ id: '123', name: 'test' })

      const result = await executeUoW(env, ctx, work)

      expect(result).toEqual({ id: '123', name: 'test' })
    })

    it('propagates transaction errors', async () => {
      mockTransaction.mockRejectedValue(new Error('DB error'))

      await expect(executeUoW(env, ctx, vi.fn())).rejects.toThrow('DB error')
    })
  })

  describe('idempotency', () => {
    it('checks idempotency when msgId provided', async () => {
      const msgId = crypto.randomUUID()

      await executeUoW(env, ctx, vi.fn(), msgId)

      expect(mockAssertMessageNotProcessed).toHaveBeenCalledWith(msgId)
    })

    it('skips idempotency check when no msgId', async () => {
      await executeUoW(env, ctx, vi.fn())

      expect(mockAssertMessageNotProcessed).not.toHaveBeenCalled()
    })
  })

  describe('event persistence', () => {
    it('persists events registered during work', async () => {
      const event = testEvent()

      await executeUoW(env, ctx, async () => {
        registerEvents([event])
      })

      expect(mockPersistEvents).toHaveBeenCalledWith([event])
    })

    it('skips persist when no events registered', async () => {
      await executeUoW(env, ctx, vi.fn())

      expect(mockPersistEvents).not.toHaveBeenCalled()
    })
  })

  describe('outbox relay', () => {
    it('triggers DO relay after commit', async () => {
      await executeUoW(env, ctx, vi.fn())

      expect(env.OUTBOX_RELAY.idFromName).toHaveBeenCalledWith('relay')
      expect(env.OUTBOX_RELAY.get).toHaveBeenCalled()
      expect(ctx.waitUntil).toHaveBeenCalled()
    })

    it('swallows relay trigger errors', async () => {
      const relay = createMockEnv().OUTBOX_RELAY
      ;(relay.get as any).mockReturnValue({
        trigger: vi.fn().mockRejectedValue(new Error('DO unavailable')),
      })
      env.OUTBOX_RELAY = relay

      const result = await executeUoW(env, ctx, async () => 'done')

      expect(result).toBe('done')
    })
  })
})
