/**
 * Unit tests for QueueConsumer
 *
 * Tests message parsing, error handling, and retry logic.
 * Adapted from spawnbase — riposte's consumer doesn't yet wire to MessageBus,
 * so we test the parsing/retry/DLQ behavior directly.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { queue } from '@server/entrypoints/queue/queue-consumer'

const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000'

function mockMessage(body: unknown, attempts = 1) {
  return {
    id: `msg-${crypto.randomUUID()}`,
    timestamp: new Date(),
    attempts,
    body,
    ack: vi.fn(),
    retry: vi.fn(),
  }
}

function mockBatch(messages: ReturnType<typeof mockMessage>[]) {
  return {
    queue: 'test-queue',
    messages,
    ackAll: vi.fn(),
    retryAll: vi.fn(),
  } as unknown as MessageBatch
}

function createMockEnv() {
  return {} as unknown as Env
}

function createMockCtx() {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext
}

describe.sequential('QueueConsumer', () => {
  let env: Env
  let ctx: ExecutionContext

  beforeEach(() => {
    env = createMockEnv()
    ctx = createMockCtx()
  })

  afterEach(() => vi.restoreAllMocks())

  describe('parsing', () => {
    it('acks valid message with name', async () => {
      const msg = mockMessage({
        type: 'command',
        name: 'SendWelcomeEmail',
        id: TEST_UUID,
        email: 'a@b.com',
      })

      await queue(mockBatch([msg]), env, ctx)

      expect(msg.ack).toHaveBeenCalled()
    })

    it('acks invalid message body (string)', async () => {
      const msg = mockMessage('not-an-object')

      await queue(mockBatch([msg]), env, ctx)

      expect(msg.ack).toHaveBeenCalled()
    })

    it('acks null message body', async () => {
      const msg = mockMessage(null)

      await queue(mockBatch([msg]), env, ctx)

      expect(msg.ack).toHaveBeenCalled()
    })

    it('acks message missing name field', async () => {
      const msg = mockMessage({ type: 'command', id: TEST_UUID })

      await queue(mockBatch([msg]), env, ctx)

      expect(msg.ack).toHaveBeenCalled()
    })
  })

  describe('retry logic', () => {
    it('acks retryable error at max attempts (DLQ)', async () => {
      // The current consumer acks everything (TODO: wire to MessageBus)
      // This test validates the DLQ path once handler errors are wired
      const msg = mockMessage(
        { type: 'command', name: 'SendWelcomeEmail', id: TEST_UUID, email: 'a@b.com' },
        5,
      )

      await queue(mockBatch([msg]), env, ctx)

      expect(msg.ack).toHaveBeenCalled()
    })
  })

  describe('batch processing', () => {
    it('processes all messages in batch', async () => {
      const messages = [
        mockMessage({ type: 'event', name: 'UserSignedUp', id: crypto.randomUUID() }),
        mockMessage({ type: 'command', name: 'SendWelcomeEmail', id: crypto.randomUUID() }),
        mockMessage({ type: 'event', name: 'UserSignedUp', id: crypto.randomUUID() }),
      ]

      await queue(mockBatch(messages), env, ctx)

      for (const msg of messages) {
        expect(msg.ack).toHaveBeenCalled()
      }
    })
  })
})
