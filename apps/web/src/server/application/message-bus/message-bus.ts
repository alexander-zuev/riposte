import type {
  CommandName,
  CommandMap,
  DomainCommand,
  DomainEvent,
  DomainMessage,
  DomainQuery,
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
import type { CommandHandler, EventHandler, QueryHandler } from '@server/application/registry/types'
import type { DrizzleDb } from '@server/infrastructure/db'

const logger = createLogger('message-bus')

function getQueryHandler<TName extends QueryName>(
  name: TName,
): QueryHandler<QueryMap[TName], MessageResult<QueryMap[TName]>> {
  return QUERY_HANDLERS[name] as unknown as QueryHandler<
    QueryMap[TName],
    MessageResult<QueryMap[TName]>
  >
}

function getCommandHandler<TName extends CommandName>(
  name: TName,
): CommandHandler<CommandMap[TName], MessageResult<CommandMap[TName]>> {
  return COMMAND_HANDLERS[name] as unknown as CommandHandler<
    CommandMap[TName],
    MessageResult<CommandMap[TName]>
  >
}

function getEventHandlers<TName extends EventName>(name: TName): EventHandler<EventMap[TName]>[] {
  return (EVENT_HANDLERS[name] ?? []) as unknown as EventHandler<EventMap[TName]>[]
}

/**
 * Interface for message bus - enables testing with mocks
 */
export interface IMessageBus {
  handle<TMessage extends DomainCommand | DomainQuery>(
    message: TMessage,
  ): Promise<MessageResult<TMessage>>
  handle<TEvent extends DomainEvent>(message: TEvent): Promise<MessageResult<TEvent>>
  handle(message: DomainMessage): Promise<unknown>
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
  handle<TMessage extends DomainCommand | DomainQuery>(
    message: TMessage,
  ): Promise<MessageResult<TMessage>>
  handle<TEvent extends DomainEvent>(message: TEvent): Promise<MessageResult<TEvent>>
  async handle(message: DomainMessage): Promise<unknown> {
    switch (message.type) {
      case 'command':
        return this.handleCommand(message)
      case 'event':
        return this.handleEvent(message)
      case 'query':
        return this.handleQuery(message)
      default:
        throw new UnknownMessageTypeError(message)
    }
  }

  /**
   * Handle a command - wrapped in UoW (tx + outbox flush)
   */
  private async handleCommand<TName extends CommandName>(
    command: CommandMap[TName],
  ): Promise<unknown> {
    const handler = getCommandHandler(command.name)

    try {
      logger.info('Handling command', { command: command.name, id: command.id })
      return await executeUoW(
        this.env,
        this.ctx,
        async (tx: DrizzleDb) => {
          return handler(command, this.env, tx)
        },
        command.id,
      )
    } catch (error) {
      if (error instanceof DuplicateMessageError) {
        logger.info('Duplicate command ignored', {
          command: command.name,
          id: command.id,
        })
        return // silent success - idempotent behavior
      }
      throw error
    }
  }

  /**
   * Handle an event - all handlers run in a single UoW (atomic)
   */
  private async handleEvent<TName extends EventName>(event: EventMap[TName]): Promise<void> {
    const handlers = getEventHandlers(event.name)
    if (handlers.length === 0) return

    try {
      await executeUoW(
        this.env,
        this.ctx,
        async (tx) => Promise.all(handlers.map(async (handler) => handler(event, this.env, tx))),
        event.id,
      )
    } catch (e) {
      if (e instanceof DuplicateMessageError) {
        logger.info(`Duplicate event skipped: ${event.name}`, { id: event.id })
        return
      }
      throw e
    }
  }

  /**
   * Handle a query - read-only, no transaction
   */
  private async handleQuery<TName extends QueryName>(query: QueryMap[TName]): Promise<unknown> {
    const handler = getQueryHandler(query.name)

    logger.debug('Handling query', { query: query.name })
    return await handler(query, this.env, this.ctx)
  }
}
