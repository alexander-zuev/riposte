import { z } from 'zod'

import { sendWelcomeEmailSchema, userSignedUpSchema } from '../auth/auth.messages'

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

// Add query schemas here as domains define them
// export const domainQuerySchema = z.discriminatedUnion('name', [])
// export type DomainQuery = z.infer<typeof domainQuerySchema>
export type QueryName = never
export type QueryMap = Record<never, never>

/* -------------------------------------------------------------------------------------------------
 * Combined Message Type
 * ----------------------------------------------------------------------------------------------- */

export type DomainMessage = DomainCommand | DomainEvent
