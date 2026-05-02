import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCommandHandler = vi.fn().mockResolvedValue({ success: true })
const mockEventHandler1 = vi.fn().mockResolvedValue(undefined)
const mockEventHandler2 = vi.fn().mockResolvedValue(undefined)
const mockQueryHandler = vi.fn().mockResolvedValue({ data: 'result' })
const mockExecuteUoW = vi
  .fn()
  .mockImplementation(
    async (_env: unknown, _ctx: unknown, callback: (tx: object) => Promise<unknown>) =>
      callback({}),
  )

vi.mock('@server/application/message-bus/unit-of-work', () => ({
  executeUoW: (...args: unknown[]) => mockExecuteUoW(...args),
}))

vi.mock('@server/application/registry/registry', () => ({
  COMMAND_HANDLERS: {
    SendWelcomeEmail: (...args: unknown[]) => mockCommandHandler(...args),
  },
  EVENT_HANDLERS: {
    UserSignedUp: [
      (...args: unknown[]) => mockEventHandler1(...args),
      (...args: unknown[]) => mockEventHandler2(...args),
    ],
    R2Event: [],
  },
  QUERY_HANDLERS: {
    GetSessionStatus: (...args: unknown[]) => mockQueryHandler(...args),
  },
}))

import { MessageBus } from '@server/application/message-bus/message-bus'

import {
  createMockCtx,
  createMockEnv,
  testCommand,
  testEvent,
  testQuery,
  testR2Event,
} from '../mocks'

describe.sequential('MessageBus', () => {
  let bus: MessageBus
  let env: Env
  let ctx: ExecutionContext

  beforeEach(() => {
    vi.clearAllMocks()
    env = createMockEnv()
    ctx = createMockCtx()
    bus = new MessageBus(env, ctx)
  })

  describe('command handling', () => {
    it('routes command to registered handler', async () => {
      const command = testCommand()

      await bus.handle(command)

      expect(mockCommandHandler).toHaveBeenCalledWith(command, env, expect.anything())
    })

    it('wraps command in UoW transaction', async () => {
      const command = testCommand()

      await bus.handle(command)

      expect(mockExecuteUoW).toHaveBeenCalledWith(env, ctx, expect.any(Function), command.id)
    })

    it('returns handler result', async () => {
      const command = testCommand()
      mockCommandHandler.mockResolvedValue({ id: '123' })

      const result = await bus.handle(command)

      expect(result).toEqual({ id: '123' })
    })
  })

  describe('event handling', () => {
    it('routes event to all registered handlers', async () => {
      const event = testEvent()

      await bus.handle(event)

      expect(mockEventHandler1).toHaveBeenCalledWith(event, env, expect.anything())
      expect(mockEventHandler2).toHaveBeenCalledWith(event, env, expect.anything())
    })

    it('wraps all event handlers in a single UoW', async () => {
      const event = testEvent()

      await bus.handle(event)

      expect(mockExecuteUoW).toHaveBeenCalledTimes(1)
      expect(mockExecuteUoW).toHaveBeenCalledWith(env, ctx, expect.any(Function), event.id)
    })

    it('handles events with no registered handlers', async () => {
      const event = testR2Event()

      await expect(bus.handle(event)).resolves.toBeUndefined()
    })

    it('propagates handler errors (transaction rolls back)', async () => {
      const event = testEvent()
      mockEventHandler1.mockRejectedValue(new Error('Handler 1 failed'))

      await expect(bus.handle(event)).rejects.toThrow('Handler 1 failed')
    })
  })

  describe('query handling', () => {
    it('routes query to registered handler', async () => {
      const query = testQuery()

      await bus.handle(query)

      expect(mockQueryHandler).toHaveBeenCalledWith(query, env, ctx)
    })

    it('does not wrap query in UoW', async () => {
      const query = testQuery()

      await bus.handle(query)

      expect(mockExecuteUoW).not.toHaveBeenCalled()
    })

    it('returns handler result', async () => {
      const query = testQuery()
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
          error instanceof Error && error.constructor.name === 'UnknownMessageTypeError',
      )
    })
  })
})
