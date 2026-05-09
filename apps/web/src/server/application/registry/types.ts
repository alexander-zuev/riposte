import type {
  BaseCommand,
  BaseEvent,
  BaseQuery,
  CommandMap,
  EventMap,
  QueryMap,
} from '@riposte/core'
import type { AppDeps } from '@server/infrastructure/app-deps'
import type { DrizzleDb } from '@server/infrastructure/db'
import type { Result } from 'better-result'

export type HandlerContext = {
  deps: AppDeps
  tx: DrizzleDb
}

export type QueryContext = {
  deps: AppDeps
}

// Commands receive tx, return plain result (events go to outbox via repo)
export type CommandHandler<TCommand extends BaseCommand, TResult = void, TError = never> = (
  command: TCommand,
  ctx: HandlerContext,
) => Promise<Result<TResult, TError>>

// Events use UoW for consistency (can modify state, produce new events)
export type EventHandler<TEvent extends BaseEvent, TError = never> = (
  event: TEvent,
  ctx: HandlerContext,
) => Promise<Result<void, TError>>

export type EventHandlerRegistration<TEvent extends BaseEvent, TError = never> = {
  id: string
  handle: EventHandler<TEvent, TError>
}

// Queries are read-only, no tx needed
// ctx is optional — only needed for background work (e.g. waitUntil)
export type QueryHandler<TQuery extends BaseQuery, TResult = unknown, TError = never> = (
  query: TQuery,
  ctx: QueryContext,
) => Promise<Result<TResult, TError>>

// Registry types - map message names to handlers
export type CommandRegistry = {
  [K in keyof CommandMap]: CommandHandler<CommandMap[K], unknown, unknown>
}

export type EventRegistry = {
  [K in keyof EventMap]?: EventHandlerRegistration<EventMap[K], unknown>[]
}

export type QueryRegistry = {
  [K in keyof QueryMap]: QueryHandler<QueryMap[K], unknown, unknown>
}

export type MessageRegistry = {
  commands: CommandRegistry
  events: EventRegistry
  queries: QueryRegistry
}
