/**
 * Unit tests for MessageBus routing
 *
 * Tests message routing:
 * - Commands → single handler, wrapped in UoW
 * - Events → multiple handlers, all in single atomic UoW
 * - Queries → single handler, no UoW
 *
 * Retry logic tested separately.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Test message factories (plain objects, schema-first style)
function createTestCommand(data: string) {
  return {
    type: 'command' as const,
    name: 'TestCommand' as const,
    id: crypto.randomUUID(),
    data,
  }
}

function createTestEvent(data: string) {
  return {
    type: 'event' as const,
    name: 'TestEvent' as const,
    id: crypto.randomUUID(),
    timestamp: '2024-01-01T00:00:00Z',
    data,
  }
}

// Queries have no id (read-only, no idempotency needed)
function createTestQuery(resourceId: string) {
  return {
    type: 'query' as const,
    name: 'TestQuery' as const,
    resourceId,
  }
}

// Mock handlers (defined before vi.mock so they can be referenced)
const mockCommandHandler = vi.fn().mockResolvedValue({ success: true })
const mockEventHandler1 = vi.fn().mockResolvedValue(undefined)
const mockEventHandler2 = vi.fn().mockResolvedValue(undefined)
const mockQueryHandler = vi.fn().mockResolvedValue({ data: 'result' })
const mockExecuteUoW = vi
  .fn()
  .mockImplementation(
    async (
      _env: unknown,
      _ctx: unknown,
      callback: (tx: object) => Promise<unknown>,
    ) => callback({}),
  )

// ============ MOCKS ============
// vi.mock calls are hoisted - order here doesn't matter but keep imports AFTER

vi.mock('@riposte/core', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
  UnknownMessageTypeError: class UnknownMessageTypeError extends Error {},
  DuplicateMessageError: class DuplicateMessageError extends Error {},
}))

vi.mock('@server/application/message-bus/unit-of-work', () => ({
  executeUoW: (...args: unknown[]) => mockExecuteUoW(...args),
}))

vi.mock('@server/application/registry/registry', () => ({
  COMMAND_HANDLERS: {
    TestCommand: (...args: unknown[]) => mockCommandHandler(...args),
  },
  EVENT_HANDLERS: {
    TestEvent: [
      (...args: unknown[]) => mockEventHandler1(...args),
      (...args: unknown[]) => mockEventHandler2(...args),
    ],
    EmptyEvent: [],
  },
  QUERY_HANDLERS: {
    TestQuery: (...args: unknown[]) => mockQueryHandler(...args),
  },
}))

// ============ IMPORTS AFTER MOCKS ============
import { MessageBus } from '@server/application/message-bus/message-bus'
import { createMockEnv } from '../mocks'

describe.sequential('MessageBus', () => {
  let bus: MessageBus
  let env: Env
  let ctx: ExecutionContext

  beforeEach(() => {
    vi.clearAllMocks()

    env = createMockEnv()
    ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as unknown as ExecutionContext
    bus = new MessageBus(env, ctx)
  })

  describe('command handling', () => {
    it('routes command to registered handler', async () => {
      const command = createTestCommand('test-data')

      await bus.handle(command)

      expect(mockCommandHandler).toHaveBeenCalledWith(
        command,
        env,
        expect.anything(),
      )
    })

    it('wraps command in UoW transaction', async () => {
      const command = createTestCommand('test-data')

      await bus.handle(command)

      expect(mockExecuteUoW).toHaveBeenCalledWith(
        env,
        ctx,
        expect.any(Function),
        command.id,
      )
    })

    it('returns handler result', async () => {
      const command = createTestCommand('test-data')
      mockCommandHandler.mockResolvedValue({ id: '123' })

      const result = await bus.handle(command)

      expect(result).toEqual({ id: '123' })
    })
  })

  describe('event handling', () => {
    it('routes event to all registered handlers', async () => {
      const event = createTestEvent('test-data')

      await bus.handle(event)

      expect(mockEventHandler1).toHaveBeenCalledWith(
        event,
        env,
        expect.anything(),
      )
      expect(mockEventHandler2).toHaveBeenCalledWith(
        event,
        env,
        expect.anything(),
      )
    })

    it('wraps all event handlers in a single UoW', async () => {
      const event = createTestEvent('test-data')

      await bus.handle(event)

      expect(mockExecuteUoW).toHaveBeenCalledTimes(1)
      expect(mockExecuteUoW).toHaveBeenCalledWith(
        env,
        ctx,
        expect.any(Function),
        event.id,
      )
    })

    it('handles events with no registered handlers', async () => {
      const event = {
        type: 'event' as const,
        name: 'EmptyEvent',
        id: crypto.randomUUID(),
        timestamp: '',
      }

      await expect(bus.handle(event)).resolves.toBeUndefined()
    })

    it('propagates handler errors (transaction rolls back)', async () => {
      const event = createTestEvent('test-data')
      mockEventHandler1.mockRejectedValue(new Error('Handler 1 failed'))

      await expect(bus.handle(event)).rejects.toThrow('Handler 1 failed')
    })
  })

  describe('query handling', () => {
    it('routes query to registered handler', async () => {
      const query = createTestQuery('123')

      await bus.handle(query)

      expect(mockQueryHandler).toHaveBeenCalledWith(query, env, ctx)
    })

    it('does not wrap query in UoW', async () => {
      const query = createTestQuery('123')

      await bus.handle(query)

      expect(mockExecuteUoW).not.toHaveBeenCalled()
    })

    it('returns handler result', async () => {
      const query = createTestQuery('123')
      mockQueryHandler.mockResolvedValue({ name: 'Test User' })

      const result = await bus.handle(query)

      expect(result).toEqual({ name: 'Test User' })
    })
  })

  describe('message type routing', () => {
    it('throws UnknownMessageTypeError for invalid message type', async () => {
      const badMessage = { type: 'invalid' as unknown, name: 'BadMessage' }

      await expect(bus.handle(badMessage as any)).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof Error &&
          error.constructor.name === 'UnknownMessageTypeError',
      )
    })
  })
})
