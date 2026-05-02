/**
 * Centralized env mocks for unit tests
 *
 * Creates a minimal mock Env with queue bindings.
 * For real bindings, use `env` from 'cloudflare:test' in integration tests.
 */
import { vi } from 'vitest'

import { createMockQueueBinding } from './queue'

/**
 * Creates a mock DurableObjectNamespace for OUTBOX_RELAY
 * Returns a stub with a mock trigger() method
 */
export function createMockOutboxRelayBinding() {
  const mockTrigger = vi.fn().mockResolvedValue(undefined)
  return {
    get: vi.fn().mockReturnValue({ trigger: mockTrigger }),
    idFromName: vi.fn().mockReturnValue('mock-do-id'),
    _mockTrigger: mockTrigger,
  }
}

/**
 * Creates a minimal mock Env for unit tests
 * Only includes bindings commonly needed in tests
 */
export function createMockEnv(): Env {
  return {
    BACKGROUND_QUEUE: createMockQueueBinding(),
    CRITICAL_QUEUE: createMockQueueBinding(),
    OUTBOX_RELAY: createMockOutboxRelayBinding(),
  } as unknown as Env
}
