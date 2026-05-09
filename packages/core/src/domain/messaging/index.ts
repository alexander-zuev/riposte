export type { BaseCommand, BaseEvent, BaseQuery, MessageId } from '../base/base.messages'
export { MessageIdSchema, externalMessageIdSchema } from '../base/base.messages'
export { createCommand, createEvent, createQuery } from './factory'
export type {
  CommandMap,
  CommandName,
  DomainCommand,
  DomainEvent,
  DomainMessage,
  DomainQuery,
  EventMap,
  EventName,
  QueryMap,
  QueryName,
} from './message-registry'
export {
  domainCommandSchema,
  domainEventSchema,
  domainQuerySchema,
  queueMessageSchema,
} from './message-registry'
