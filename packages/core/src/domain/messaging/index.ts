export { createCommand, createEvent, createQuery } from './factory'
export type {
  CommandMap,
  CommandName,
  DomainCommand,
  DomainEvent,
  DomainMessage,
  EventMap,
  EventName,
  QueryMap,
  QueryName,
} from './message-registry'
export { domainCommandSchema, domainEventSchema } from './message-registry'
