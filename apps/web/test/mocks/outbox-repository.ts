import { vi } from 'vitest'

export const mockAssertMessageNotProcessed = vi.fn().mockResolvedValue(undefined)
export const mockPersistEvents = vi.fn().mockResolvedValue(undefined)

export function mockOutboxRepositoryModule() {
  return {
    OutboxRepository: vi.fn().mockImplementation(function () {
      return {
        assertMessageNotProcessed: mockAssertMessageNotProcessed,
        persistEvents: mockPersistEvents,
      }
    }),
  }
}
