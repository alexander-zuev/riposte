import type {
  BaseCommand,
  BaseEvent,
  BaseQuery,
  CommandMap,
  EventMap,
  QueryMap,
} from '@riposte/core'
import type { DrizzleDb } from '@server/infrastructure/db'
import type { Result } from 'better-result'

// Commands receive tx, return plain result (events go to outbox via repo)
export type CommandHandler<TCommand extends BaseCommand, TResult = void, TError = never> = (
  command: TCommand,
  env: Env,
  tx: DrizzleDb,
) => Promise<Result<TResult, TError>>

// Events use UoW for consistency (can modify state, produce new events)
export type EventHandler<TEvent extends BaseEvent, TError = never> = (
  event: TEvent,
  env: Env,
  tx: DrizzleDb,
) => Promise<Result<void, TError>>

export type EventHandlerRegistration<TEvent extends BaseEvent, TError = never> = {
  id: string
  handle: EventHandler<TEvent, TError>
}

// Queries are read-only, no tx needed
// ctx is optional — only needed for background work (e.g. waitUntil)
export type QueryHandler<TQuery extends BaseQuery, TResult = unknown, TError = never> = (
  query: TQuery,
  env: Env,
  ctx?: Pick<ExecutionContext, 'waitUntil'>,
) => Promise<Result<TResult, TError>>

// Registry types - map message names to handlers
export type CommandRegistry = {
  [K in keyof CommandMap]: CommandHandler<CommandMap[K], any, any>
}

export type EventRegistry = {
  [K in keyof EventMap]?: EventHandlerRegistration<EventMap[K]>[]
}

export type QueryRegistry = {
  [K in keyof QueryMap]: QueryHandler<QueryMap[K], any, any>
}
