import type { MessageId } from '../base/base.messages'
import type { UUIDv4 } from '../primitives'
import type {
  CommandMap,
  CommandName,
  EventMap,
  EventName,
  QueryMap,
  QueryName,
} from './message-registry'

/**
 * Message Factories
 *
 * Create type-safe domain messages with automatic ID generation.
 * Used when dispatching messages to queues.
 */

// Fields the factory adds - caller doesn't provide these
type CommandFactoryFields = 'id' | 'type' | 'name'
type EventFactoryFields = 'id' | 'type' | 'name' | 'timestamp'
type QueryFactoryFields = 'type' | 'name'

// What the caller provides
type CommandData<T extends CommandName> = Omit<CommandMap[T], CommandFactoryFields>
type EventData<T extends EventName> = Omit<EventMap[T], EventFactoryFields>
type QueryData<T extends QueryName> = Omit<QueryMap[T], QueryFactoryFields>

export function createCommand<T extends CommandName>(
  name: T,
  data: CommandData<T>,
  id: MessageId = crypto.randomUUID(),
): CommandMap[T] {
  return {
    id,
    type: 'command' as const,
    name,
    ...data,
  } as CommandMap[T]
}

export function createEvent<T extends EventName>(
  name: T,
  data: EventData<T>,
  id: UUIDv4 = crypto.randomUUID(),
  timestamp: Date = new Date(),
): EventMap[T] {
  return {
    id,
    type: 'event' as const,
    name,
    timestamp: timestamp.toISOString(),
    ...data,
  } as EventMap[T]
}

export function createQuery<T extends QueryName>(name: T, data: QueryData<T>): QueryMap[T] {
  return {
    type: 'query' as const,
    name,
    ...data,
  } as QueryMap[T]
}
