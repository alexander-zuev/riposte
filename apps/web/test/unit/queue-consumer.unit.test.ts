import { queue } from '@server/entrypoints/queue/queue-consumer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockCtx, createMockEnv, testCommand, testEvent } from '../mocks'

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
      const msg = mockMessage(testCommand({ email: 'a@b.com' }))

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
      const msg = mockMessage({ type: 'command', id: crypto.randomUUID() })

      await queue(mockBatch([msg]), env, ctx)

      expect(msg.ack).toHaveBeenCalled()
    })
  })

  describe('retry logic', () => {
    it('acks retryable error at max attempts (DLQ)', async () => {
      const msg = mockMessage(testCommand({ email: 'a@b.com' }), 5)

      await queue(mockBatch([msg]), env, ctx)

      expect(msg.ack).toHaveBeenCalled()
    })
  })

  describe('batch processing', () => {
    it('processes all messages in batch', async () => {
      const messages = [
        mockMessage(testEvent()),
        mockMessage(testCommand()),
        mockMessage(testEvent({ email: 'other@test.com' })),
      ]

      await queue(mockBatch(messages), env, ctx)

      for (const msg of messages) {
        expect(msg.ack).toHaveBeenCalled()
      }
    })
  })
})
