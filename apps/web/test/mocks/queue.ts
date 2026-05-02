import { vi } from 'vitest'

export interface MockQueueService {
  send: ReturnType<typeof vi.fn>
  sendBatch: ReturnType<typeof vi.fn>
}

export function createMockQueueService(): MockQueueService {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    sendBatch: vi.fn().mockResolvedValue(undefined),
  }
}

export function createMockQueueBinding() {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    sendBatch: vi.fn().mockResolvedValue(undefined),
  }
}
