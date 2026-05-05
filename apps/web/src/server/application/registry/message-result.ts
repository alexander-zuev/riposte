import type {
  DatabaseError,
  DomainCommand,
  DomainEvent,
  DomainMessage,
  DomainQuery,
  DuplicateMessageError,
  UnknownMessageTypeError,
} from '@riposte/core'
import type { COMMAND_HANDLERS, QUERY_HANDLERS } from '@server/application/registry/registry'
import type { EventHandler } from '@server/application/registry/types'
import type { Result } from 'better-result'

type ResultValue<TResult> = TResult extends Result<infer TValue, unknown> ? TValue : never
type ResultError<TResult> = TResult extends Result<unknown, infer TError> ? TError : never

type CommandResult<TCommand extends DomainCommand> =
  TCommand['name'] extends keyof typeof COMMAND_HANDLERS
    ? Awaited<ReturnType<(typeof COMMAND_HANDLERS)[TCommand['name']]>>
    : never

type QueryResult<TQuery extends DomainQuery> = TQuery['name'] extends keyof typeof QUERY_HANDLERS
  ? Awaited<ReturnType<(typeof QUERY_HANDLERS)[TQuery['name']]>>
  : never

type EventResult<TEvent extends DomainEvent> = Awaited<ReturnType<EventHandler<TEvent>>>

type HandlerResult<TMessage extends DomainMessage> = TMessage extends DomainCommand
  ? CommandResult<TMessage>
  : TMessage extends DomainQuery
    ? QueryResult<TMessage>
    : TMessage extends DomainEvent
      ? EventResult<TMessage>
      : never

export type MessageValue<TMessage extends DomainMessage> = ResultValue<HandlerResult<TMessage>>

export type EventMessageValue<TMessage extends DomainMessage> = TMessage extends DomainEvent
  ? void
  : MessageValue<TMessage>

export type MessageError<TMessage extends DomainMessage> = ResultError<HandlerResult<TMessage>>

export type MessageBusError<TMessage extends DomainMessage> =
  | MessageError<TMessage>
  | DatabaseError
  | DuplicateMessageError
  | UnknownMessageTypeError

export type MessageResult<TMessage extends DomainMessage> = Result<
  EventMessageValue<TMessage>,
  MessageBusError<TMessage>
>
