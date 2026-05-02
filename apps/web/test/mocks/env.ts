import { vi } from 'vitest'

import { createMockQueueBinding } from './queue'

export function createMockOutboxRelayBinding() {
  const mockTrigger = vi.fn().mockResolvedValue(undefined)
  return {
    get: vi.fn().mockReturnValue({ trigger: mockTrigger }),
    idFromName: vi.fn().mockReturnValue('mock-do-id'),
    _mockTrigger: mockTrigger,
  }
}

export function createMockEnv(): Env {
  return {
    BACKGROUND_QUEUE: createMockQueueBinding(),
    CRITICAL_QUEUE: createMockQueueBinding(),
    OUTBOX_RELAY: createMockOutboxRelayBinding(),
  } as unknown as Env
}

export function createMockCtx(): ExecutionContext {
  return {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  } as unknown as ExecutionContext
}
