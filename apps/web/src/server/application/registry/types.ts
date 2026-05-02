import type {
  BaseCommand,
  BaseEvent,
  BaseQuery,
  CommandMap,
  EventMap,
  QueryMap,
} from '@riposte/core'
import type { DrizzleDb } from '@server/infrastructure/db'

// Commands receive tx, return plain result (events go to outbox via repo)
export type CommandHandler<TCommand extends BaseCommand, TResult = void> = (
  command: TCommand,
  env: Env,
  tx: DrizzleDb,
) => Promise<TResult>

// Events use UoW for consistency (can modify state, produce new events)
export type EventHandler<TEvent extends BaseEvent> = (
  event: TEvent,
  env: Env,
  tx: DrizzleDb,
) => Promise<void>

// Queries are read-only, no tx needed
// ctx is optional — only needed for background work (e.g. waitUntil)
export type QueryHandler<TQuery extends BaseQuery, TResult = unknown> = (
  query: TQuery,
  env: Env,
  ctx?: Pick<ExecutionContext, 'waitUntil'>,
) => Promise<TResult>

// Registry types - map message names to handlers
export type CommandRegistry = {
  [K in keyof CommandMap]: CommandHandler<CommandMap[K], any>
}

export type EventRegistry = {
  [K in keyof EventMap]?: EventHandler<EventMap[K]>[]
}

export type QueryRegistry = {
  [K in keyof QueryMap]: QueryHandler<QueryMap[K], any>
}
