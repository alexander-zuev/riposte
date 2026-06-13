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
import type { MessageResult } from '@server/application/registry/message-result'
import { defaultRegistry } from '@server/application/registry/registry'
import type {
  CommandHandler,
  EventSubscriber,
  MessageRegistry,
  QueryHandler,
} from '@server/application/registry/types'
import type { AppDeps } from '@server/infrastructure/app-deps'
import type { Tx } from '@server/infrastructure/db'
import { Result, panic } from 'better-result'

const logger = createLogger('message-bus')

type AnyCommandHandler = CommandHandler<any, unknown, unknown>
type AnyQueryHandler = QueryHandler<any, unknown, unknown>

/** One subscriber's result tagged with its handler id, so failures can be attributed. */
type HandlerOutcome = { id: string; result: Result<void, unknown> }

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
    private readonly deps: AppDeps,
    private readonly registry: MessageRegistry = defaultRegistry,
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
    const handler = this.getCommandHandler(command.name)
    const result = await Result.gen(async function* () {
      const value = yield* Result.await(
        this.deps.uow.execute(
          async (tx: Tx) => handler(command, { deps: this.deps, tx }),
          command.id,
        ),
      )
      return Result.ok(value)
    }, this)

    return result as MessageResult<CommandMap[TName]>
  }

  /**
   * Handle an event. Each subscriber declares its `mode`; the bus runs `state` subscribers
   * inside a UoW (tx + claim) and `effect` subscribers outside any UoW (no tx, no claim, for
   * external I/O). Every subscriber is normalized to a HandlerOutcome that always resolves,
   * so a thrown panic cannot reject the batch; outcomes are collapsed into one result.
   * Partial commits possible — the UoWs are independent.
   */
  private async handleEvent<TName extends EventName>(
    event: EventMap[TName],
  ): Promise<MessageResult<EventMap[TName]>> {
    const subscribers = this.registry.events[event.name] ?? []
    if (subscribers.length === 0) {
      return Result.ok(undefined) as MessageResult<EventMap[TName]>
    }

    const outcomes = await Promise.all(
      subscribers.map(async (subscriber) => this.runEventSubscriber(event, subscriber)),
    )

    return this.collapseEventOutcomes(event, outcomes)
  }

  /**
   * Runs one subscriber and always resolves to a HandlerOutcome — a thrown panic becomes
   * `Result.err` so `Promise.all` over siblings can never reject. `state` subscribers run in
   * their own UoW with a per-subscriber receipt `${event.id}:${id}`; a duplicate delivery is
   * treated as success so the queue acks. `effect` subscribers run with no UoW and no claim.
   */
  private async runEventSubscriber<TName extends EventName>(
    event: EventMap[TName],
    subscriber: EventSubscriber<EventMap[TName]>,
  ): Promise<HandlerOutcome> {
    const { id } = subscriber
    try {
      if (subscriber.mode === 'effect') {
        logger.debug('Handling effect subscriber', {
          event: event.name,
          eventId: event.id,
          handlerId: id,
        })
        return { id, result: await subscriber.handle(event, { deps: this.deps }) }
      }

      logger.debug('Handling event subscriber', {
        event: event.name,
        eventId: event.id,
        handlerId: id,
      })
      const result = await this.deps.uow.execute(
        async (tx) => subscriber.handle(event, { deps: this.deps, tx }),
        `${event.id}:${id}`,
      )
      if (result.isErr() && DuplicateMessageError.is(result.error)) {
        logger.warn('Duplicate event handler skipped', {
          event: event.name,
          eventId: event.id,
          handlerId: id,
        })
        return { id, result: Result.ok(undefined) }
      }
      return { id, result }
    } catch (cause) {
      return { id, result: Result.err(cause) }
    }
  }

  /**
   * The first failure is returned so the queue consumer logs/retries the delivery;
   * sibling failures would otherwise vanish, so they are logged here with their id.
   */
  private collapseEventOutcomes<TName extends EventName>(
    event: EventMap[TName],
    outcomes: HandlerOutcome[],
  ): MessageResult<EventMap[TName]> {
    let returnedErr: unknown
    for (const { id, result } of outcomes) {
      if (!result.isErr()) continue
      if (returnedErr === undefined) {
        returnedErr = result.error
        continue
      }
      logger.warn('Event handler sibling failed', {
        event: event.name,
        eventId: event.id,
        handlerId: id,
        error: result.error,
      })
    }

    if (returnedErr !== undefined) {
      return Result.err(returnedErr) as MessageResult<EventMap[TName]>
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
    const handler = this.getQueryHandler(query.name)

    const result = await Result.gen(async function* () {
      const value = yield* Result.await(handler(query, { deps: this.deps }))
      return Result.ok(value)
    }, this)

    return result as MessageResult<QueryMap[TName]>
  }

  private getQueryHandler(name: QueryName): AnyQueryHandler {
    const handler = this.registry.queries[name] as AnyQueryHandler | undefined
    if (!handler) {
      return panic(`Missing query handler: ${name}`)
    }

    return handler
  }

  private getCommandHandler(name: CommandName): AnyCommandHandler {
    const handler = this.registry.commands[name] as AnyCommandHandler | undefined
    if (!handler) {
      return panic(`Missing command handler: ${name}`)
    }

    return handler
  }
}
