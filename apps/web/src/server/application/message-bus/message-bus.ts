import type {
  CommandName,
  CommandMap,
  DomainMessage,
  EventMap,
  EventName,
  QueryMap,
  QueryName,
} from '@riposte/core'
import { createLogger, DuplicateMessageError, UnknownMessageTypeError } from '@riposte/core'
import { executeUoW } from '@server/application/message-bus/unit-of-work'
import type { MessageResult } from '@server/application/registry/message-result'
import {
  COMMAND_HANDLERS,
  EVENT_HANDLERS,
  QUERY_HANDLERS,
} from '@server/application/registry/registry'
import type {
  CommandHandler,
  CommandRegistry,
  EventHandlerRegistration,
  QueryHandler,
  QueryRegistry,
} from '@server/application/registry/types'
import type { DrizzleDb } from '@server/infrastructure/db'
import { Result, panic } from 'better-result'

const logger = createLogger('message-bus')

type AnyCommandHandler = CommandHandler<any, unknown, unknown>
type AnyQueryHandler = QueryHandler<any, unknown, unknown>

function getQueryHandler(name: QueryName): AnyQueryHandler {
  const queryHandlers = QUERY_HANDLERS as Partial<QueryRegistry>
  const handler = queryHandlers[name] as AnyQueryHandler | undefined
  if (!handler) {
    return panic(`Missing query handler: ${name}`)
  }

  return handler
}

function getCommandHandler(name: CommandName): AnyCommandHandler {
  const commandHandlers = COMMAND_HANDLERS as Partial<CommandRegistry>
  const handler = commandHandlers[name] as AnyCommandHandler | undefined
  if (!handler) {
    return panic(`Missing command handler: ${name}`)
  }

  return handler
}

function getEventHandlers<TName extends EventName>(
  name: TName,
): EventHandlerRegistration<EventMap[TName]>[] {
  return (EVENT_HANDLERS[name] ?? []) as EventHandlerRegistration<EventMap[TName]>[]
}

/**
 * Interface for message bus - enables testing with mocks
 */
export interface IMessageBus {
  handle<TMessage extends DomainMessage>(message: TMessage): Promise<MessageResult<TMessage>>
}

/**
 * MessageBus - Central message processing system
 *
 * Commands: handle business logic, emit events through UoW in a transaction
 * Events: consumed from the queue, emit events through UoW in a transaction
 * Queries: read-only, no transaction
 */
export class MessageBus implements IMessageBus {
  constructor(
    private readonly env: Env,
    private readonly ctx: Pick<ExecutionContext, 'waitUntil'>,
  ) {}

  /**
   * Main entry point - routes message to appropriate handler
   */
  async handle<TMessage extends DomainMessage>(
    message: TMessage,
  ): Promise<MessageResult<TMessage>> {
    switch (message.type) {
      case 'command':
        return this.handleCommand(message) as Promise<MessageResult<TMessage>>
      case 'event':
        return this.handleEvent(message) as Promise<MessageResult<TMessage>>
      case 'query':
        return this.handleQuery(message) as Promise<MessageResult<TMessage>>
      default:
        return Result.err(
          new UnknownMessageTypeError({
            messageType: String((message as DomainMessage).type ?? message),
          }),
        ) as MessageResult<TMessage>
    }
  }

  /**
   * Handle a command - wrapped in UoW (tx + outbox flush)
   */
  private async handleCommand<TName extends CommandName>(
    command: CommandMap[TName],
  ): Promise<MessageResult<CommandMap[TName]>> {
    logger.info('Handling command', { command: command.name, id: command.id })
    const env = this.env
    const handler = getCommandHandler(command.name)
    const result = await Result.gen(async function* () {
      const value = yield* Result.await(
        executeUoW(async (tx: DrizzleDb) => handler(command, env, tx), command.id),
      )
      return Result.ok(value)
    })

    if (result.isErr() && DuplicateMessageError.is(result.error)) {
      logger.warn('Duplicate command ignored', {
        command: command.name,
        id: command.id,
      })
      return Result.ok(undefined) as MessageResult<CommandMap[TName]>
    }

    return result as MessageResult<CommandMap[TName]>
  }

  /**
   * Handle an event - all handlers run in a single UoW (atomic)
   */
  private async handleEvent<TName extends EventName>(
    event: EventMap[TName],
  ): Promise<MessageResult<EventMap[TName]>> {
    const handlers = getEventHandlers(event.name)
    if (handlers.length === 0) return Result.ok(undefined) as MessageResult<EventMap[TName]>

    const env = this.env
    const results = await Promise.all(
      handlers.map(async ({ id, handle }) => {
        const receiptId = `${event.id}:${id}`
        logger.debug('Handling event subscriber', {
          event: event.name,
          eventId: event.id,
          handlerId: id,
        })
        const result = await executeUoW(async (tx) => handle(event, env, tx), receiptId)

        if (result.isErr() && DuplicateMessageError.is(result.error)) {
          logger.warn('Duplicate event handler skipped', {
            event: event.name,
            eventId: event.id,
            handlerId: id,
          })
          return Result.ok(undefined)
        }

        return result
      }),
    )

    const failed = results.find((result) => result.isErr())
    if (failed?.isErr()) {
      logger.warn('Event handler failed', {
        event: event.name,
        eventId: event.id,
        error: failed.error,
      })
      return Result.err(failed.error) as MessageResult<EventMap[TName]>
    }

    return Result.ok(undefined) as MessageResult<EventMap[TName]>
  }

  /**
   * Handle a query - read-only, no transaction
   */
  private async handleQuery<TName extends QueryName>(
    query: QueryMap[TName],
  ): Promise<MessageResult<QueryMap[TName]>> {
    logger.debug('Handling query', { query: query.name })
    const env = this.env
    const ctx = this.ctx
    const handler = getQueryHandler(query.name)

    const result = await Result.gen(async function* () {
      const value = yield* Result.await(handler(query, env, ctx))
      return Result.ok(value)
    })

    return result as MessageResult<QueryMap[TName]>
  }
}
