import type {
  BaseCommand,
  BaseEvent,
  BaseQuery,
  CommandMap,
  EventMap,
  QueryMap,
} from '@riposte/core'
import type { AppDeps } from '@server/infrastructure/app-deps'
import type { Tx } from '@server/infrastructure/db'
import type { Result } from 'better-result'

export type HandlerContext = {
  deps: AppDeps
  tx: Tx
}

export type QueryContext = {
  deps: AppDeps
}

// Commands receive tx, return plain result (events go to outbox via repo)
export type CommandHandler<TCommand extends BaseCommand, TResult = void, TError = never> = (
  command: TCommand,
  ctx: HandlerContext,
) => Promise<Result<TResult, TError>>

// State event handler: mutates Postgres, runs inside a UoW (tx + per-subscriber claim).
export type EventHandler<TEvent extends BaseEvent, TError = never> = (
  event: TEvent,
  ctx: HandlerContext,
) => Promise<Result<void, TError>>

// Effect event handler: external I/O only (DO RPC, queue sends), runs with NO tx and NO
// claim — it must not be held inside a transaction. Dedupe is delegated to the outcome
// commands it dispatches. EffectDeps omits repos/uow/readDb, so the absence of `tx` and of
// write capabilities is what prevents an effect from writing Postgres directly.
export type EffectDeps = Pick<AppDeps, 'env' | 'ctx' | 'services' | 'kv'>

export type EffectContext = {
  deps: EffectDeps
}

export type EffectHandler<TEvent extends BaseEvent, TError = never> = (
  event: TEvent,
  ctx: EffectContext,
) => Promise<Result<void, TError>>

// A subscriber to an event, tagged with the mode the bus dispatches it under. `mode` is a
// wiring fact, written at registration; the handler stays a plain function. The discriminant
// ties mode to handler shape: a 'state' handler cannot be placed in the 'effect' arm (its
// ctx requires `tx`, which the effect ctx lacks).
export type EventSubscriber<TEvent extends BaseEvent> =
  | { id: string; mode: 'state'; handle: EventHandler<TEvent, unknown> }
  | { id: string; mode: 'effect'; handle: EffectHandler<TEvent, unknown> }

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
  [K in keyof EventMap]?: EventSubscriber<EventMap[K]>[]
}

export type QueryRegistry = {
  [K in keyof QueryMap]: QueryHandler<QueryMap[K], unknown, unknown>
}

export type MessageRegistry = {
  commands: CommandRegistry
  events: EventRegistry
  queries: QueryRegistry
}
