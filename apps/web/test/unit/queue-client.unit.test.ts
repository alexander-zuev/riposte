import { createCommand, createEvent } from '@riposte/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { QueueClient } from '@server/infrastructure/queues/queue-client'

function createMockEnv() {
  return {
    CRITICAL_QUEUE: { send: vi.fn(), sendBatch: vi.fn() },
    BACKGROUND_QUEUE: { send: vi.fn(), sendBatch: vi.fn() },
  } as unknown as Env
}

describe.sequential('QueueClient', () => {
  let env: ReturnType<typeof createMockEnv>
  let client: QueueClient

  beforeEach(() => {
    env = createMockEnv()
    client = new QueueClient(env as Env)
  })

  afterEach(() => vi.restoreAllMocks())

  describe('send() routing', () => {
    it('routes events → BACKGROUND_QUEUE', async () => {
      const event = createEvent('UserSignedUp', {
        userId: 'u1',
        email: 'u1@test.com',
        signupMethod: 'google',
      })

      await client.send(event)

      expect(env.BACKGROUND_QUEUE.send).toHaveBeenCalledOnce()
      expect(env.CRITICAL_QUEUE.send).not.toHaveBeenCalled()
    })

    it('routes commands → CRITICAL_QUEUE', async () => {
      const cmd = createCommand('SendWelcomeEmail', { email: 'a@b.com' })

      await client.send(cmd)

      expect(env.CRITICAL_QUEUE.send).toHaveBeenCalledOnce()
      expect(env.BACKGROUND_QUEUE.send).not.toHaveBeenCalled()
    })
  })

  describe('send() payload', () => {
    it('preserves message id for idempotency', async () => {
      const id = crypto.randomUUID()
      const cmd = createCommand('SendWelcomeEmail', { email: 'a@b.com' }, id)

      await client.send(cmd)

      expect(env.CRITICAL_QUEUE.send).toHaveBeenCalledWith(
        expect.objectContaining({ id }),
      )
    })
  })

  describe('sendBatch()', () => {
    it('groups messages by type: commands → CRITICAL, events → BACKGROUND', async () => {
      const messages = [
        createEvent('UserSignedUp', {
          userId: 'u1',
          email: 'u1@test.com',
          signupMethod: 'google',
        }),
        createEvent('UserSignedUp', {
          userId: 'u2',
          email: 'u2@test.com',
          signupMethod: 'github',
        }),
        createCommand('SendWelcomeEmail', { email: 'a@b.com' }),
      ]

      await client.sendBatch(messages)

      // 1 command → CRITICAL
      expect(env.CRITICAL_QUEUE.sendBatch).toHaveBeenCalledOnce()
      expect(
        vi.mocked(env.CRITICAL_QUEUE.sendBatch).mock.calls[0]![0],
      ).toHaveLength(1)

      // 2 events → BACKGROUND
      expect(env.BACKGROUND_QUEUE.sendBatch).toHaveBeenCalledOnce()
      expect(
        vi.mocked(env.BACKGROUND_QUEUE.sendBatch).mock.calls[0]![0],
      ).toHaveLength(2)
    })

    it('skips empty batch', async () => {
      await client.sendBatch([])

      expect(env.CRITICAL_QUEUE.sendBatch).not.toHaveBeenCalled()
      expect(env.BACKGROUND_QUEUE.sendBatch).not.toHaveBeenCalled()
    })
  })
})
