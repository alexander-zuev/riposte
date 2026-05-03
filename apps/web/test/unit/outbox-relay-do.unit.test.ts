import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  mockFlush,
  mockGetAlarm,
  mockSetAlarm,
  createMockDoCtx,
  mockOutboxRelayModule,
  mockCloudflareWorkersModule,
} from '../mocks'

vi.mock('@sentry/cloudflare', () => ({
  instrumentDurableObjectWithSentry: (_opts: unknown, cls: unknown) => cls,
}))

vi.mock('@server/infrastructure/db/connection', () => ({
  createDatabase: vi.fn(() => ({})),
}))

vi.mock('@server/infrastructure/queues/outbox-relay', () => mockOutboxRelayModule())
vi.mock('cloudflare:workers', () => mockCloudflareWorkersModule())

import { OutboxRelayDO } from '@server/infrastructure/durable-objects/outbox-relay-do'

describe.sequential('OutboxRelayDO', () => {
  let dobj: InstanceType<typeof OutboxRelayDO>
  let env: Env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))

    env = {} as Env
    dobj = new OutboxRelayDO(createMockDoCtx() as any, env)
  })

  describe('trigger()', () => {
    it('sets alarm if none exists', async () => {
      mockGetAlarm.mockResolvedValue(null)

      await dobj.trigger()

      expect(mockSetAlarm).toHaveBeenCalledWith(Date.now())
    })

    it('skips if alarm already set (coalescing)', async () => {
      mockGetAlarm.mockResolvedValue(Date.now() + 1000)

      await dobj.trigger()

      expect(mockSetAlarm).not.toHaveBeenCalled()
    })
  })

  describe('alarm()', () => {
    it('calls OutboxRelay.flush with batch size', async () => {
      mockFlush.mockResolvedValue(10)

      await dobj.alarm()

      expect(mockFlush).toHaveBeenCalledWith(env, 50)
    })

    it('self-schedules if batch was full', async () => {
      mockFlush.mockResolvedValue(50)

      await dobj.alarm()

      expect(mockSetAlarm).toHaveBeenCalledWith(Date.now())
    })

    it('does not self-schedule if batch not full', async () => {
      mockFlush.mockResolvedValue(10)

      await dobj.alarm()

      expect(mockSetAlarm).not.toHaveBeenCalled()
    })

    it('throws on flush error for CF retry', async () => {
      mockFlush.mockRejectedValue(new Error('Queue unavailable'))

      await expect(dobj.alarm()).rejects.toThrow('Queue unavailable')
    })
  })
})
