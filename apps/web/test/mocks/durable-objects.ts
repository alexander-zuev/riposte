import { vi } from 'vitest'

export const mockGetAlarm = vi.fn()
export const mockSetAlarm = vi.fn()
export const mockFlush = vi.fn()

export function createMockDoCtx() {
  return {
    storage: { getAlarm: mockGetAlarm, setAlarm: mockSetAlarm },
  }
}

export function mockOutboxRelayModule() {
  return {
    OutboxRelay: vi.fn().mockImplementation(function () {
      return { flush: mockFlush }
    }),
  }
}

export function mockCloudflareWorkersModule() {
  return {
    DurableObject: class {
      env: unknown
      ctx: { storage: { getAlarm: typeof mockGetAlarm; setAlarm: typeof mockSetAlarm } }
      constructor(ctx: unknown, env: unknown) {
        this.env = env
        this.ctx = createMockDoCtx()
      }
    },
  }
}
