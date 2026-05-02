import type { DomainCommand, DomainEvent, DomainMessage, DomainQuery } from '@riposte/core'
import type { COMMAND_HANDLERS, QUERY_HANDLERS } from '@server/application/registry/registry'
import type { EventHandler } from '@server/application/registry/types'

type CommandResult<TCommand extends DomainCommand> =
  TCommand['name'] extends keyof typeof COMMAND_HANDLERS
    ? Awaited<ReturnType<(typeof COMMAND_HANDLERS)[TCommand['name']]>>
    : never

type QueryResult<TQuery extends DomainQuery> = TQuery['name'] extends keyof typeof QUERY_HANDLERS
  ? Awaited<ReturnType<(typeof QUERY_HANDLERS)[TQuery['name']]>>
  : never

type EventResult<TEvent extends DomainEvent> = Awaited<ReturnType<EventHandler<TEvent>>>

export type MessageResult<TMessage extends DomainMessage> = TMessage extends DomainCommand
  ? CommandResult<TMessage>
  : TMessage extends DomainQuery
    ? QueryResult<TMessage>
    : TMessage extends DomainEvent
      ? EventResult<TMessage>
      : never
