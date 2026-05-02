import { z } from 'zod'

import {
  getSessionStatusSchema,
  sendWelcomeEmailSchema,
  userSignedUpSchema,
} from '../auth/auth.messages'
import { r2EventNotificationSchema } from '../storage/r2.messages'

/* -------------------------------------------------------------------------------------------------
 * Command Union & Map
 * ----------------------------------------------------------------------------------------------- */

export const domainCommandSchema = z.discriminatedUnion('name', [sendWelcomeEmailSchema])

export type DomainCommand = z.infer<typeof domainCommandSchema>
export type CommandName = DomainCommand['name']
export type CommandMap = {
  [K in CommandName]: Extract<DomainCommand, { name: K }>
}

/* -------------------------------------------------------------------------------------------------
 * Event Union & Map
 * ----------------------------------------------------------------------------------------------- */

export const domainEventSchema = z.discriminatedUnion('name', [userSignedUpSchema])

export type DomainEvent = z.infer<typeof domainEventSchema>
export type EventName = DomainEvent['name']
export type EventMap = {
  [K in EventName]: Extract<DomainEvent, { name: K }>
}

/* -------------------------------------------------------------------------------------------------
 * Query Union & Map
 * ----------------------------------------------------------------------------------------------- */

export const domainQuerySchema = z.discriminatedUnion('name', [getSessionStatusSchema])

export type DomainQuery = z.infer<typeof domainQuerySchema>
export type QueryName = DomainQuery['name']
export type QueryMap = {
  [K in QueryName]: Extract<DomainQuery, { name: K }>
}

/* -------------------------------------------------------------------------------------------------
 * Combined Message Type
 * ----------------------------------------------------------------------------------------------- */

export type DomainMessage = DomainCommand | DomainEvent | DomainQuery

/* -------------------------------------------------------------------------------------------------
 * Queue Message Schema
 *
 * Union of all message schemas accepted by the queue consumer.
 * Validates incoming queue payloads before routing to the message bus.
 * ----------------------------------------------------------------------------------------------- */

export const queueMessageSchema = z.union([
  domainCommandSchema,
  domainEventSchema,
  r2EventNotificationSchema,
])
