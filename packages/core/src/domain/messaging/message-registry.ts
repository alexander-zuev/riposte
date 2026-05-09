import { z } from 'zod'

import {
  getSessionStatusSchema,
  sendMagicLinkSchema,
  sendWelcomeEmailSchema,
  userSignedUpSchema,
} from '../auth/auth.messages'
import { getConnectionsStatusSchema } from '../connections'
import {
  ingestDisputeClosedSchema,
  ingestDisputeCreatedSchema,
  ingestDisputeFundsReinstatedSchema,
  ingestDisputeFundsWithdrawnSchema,
  ingestDisputeUpdatedSchema,
  collectDisputeEvidenceSchema,
  decideDisputeSubmissionSchema,
  enrichDisputeContextSchema,
  prepareEvidencePacketSchema,
  reviewEvidencePacketSchema,
  submitDisputeResponseSchema,
  syncDisputesSchema,
} from '../disputes/dispute.commands'
import { disputeCaseReceivedSchema } from '../disputes/dispute.events'
import { getStripeAppSettingsSchema } from '../disputes/dispute.queries'
import { r2EventSchema, r2EventTransform } from '../storage/r2.messages'
import { handleStripeAppAuthorizedSchema, handleStripeAppDeauthorizedSchema } from '../stripe'
import { joinWaitlistSchema } from '../waitlist/waitlist.messages'

/* -------------------------------------------------------------------------------------------------
 * Command Union & Map
 * ----------------------------------------------------------------------------------------------- */

export const domainCommandSchema = z.discriminatedUnion('name', [
  sendMagicLinkSchema,
  sendWelcomeEmailSchema,
  joinWaitlistSchema,
  ingestDisputeCreatedSchema,
  ingestDisputeUpdatedSchema,
  ingestDisputeClosedSchema,
  ingestDisputeFundsReinstatedSchema,
  ingestDisputeFundsWithdrawnSchema,
  syncDisputesSchema,
  enrichDisputeContextSchema,
  collectDisputeEvidenceSchema,
  prepareEvidencePacketSchema,
  reviewEvidencePacketSchema,
  decideDisputeSubmissionSchema,
  submitDisputeResponseSchema,
  handleStripeAppAuthorizedSchema,
  handleStripeAppDeauthorizedSchema,
])

export type DomainCommand = z.infer<typeof domainCommandSchema>
export type CommandName = DomainCommand['name']
export type CommandMap = {
  [K in CommandName]: Extract<DomainCommand, { name: K }>
}

/* -------------------------------------------------------------------------------------------------
 * Event Union & Map
 * ----------------------------------------------------------------------------------------------- */

export const domainEventSchema = z.discriminatedUnion('name', [
  userSignedUpSchema,
  disputeCaseReceivedSchema,
  r2EventSchema,
])

export type DomainEvent = z.infer<typeof domainEventSchema>
export type EventName = DomainEvent['name']
export type EventMap = {
  [K in EventName]: Extract<DomainEvent, { name: K }>
}

/* -------------------------------------------------------------------------------------------------
 * Query Union & Map
 * ----------------------------------------------------------------------------------------------- */

export const domainQuerySchema = z.discriminatedUnion('name', [
  getSessionStatusSchema,
  getConnectionsStatusSchema,
  getStripeAppSettingsSchema,
])

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
 * Domain messages pass through, raw R2 events get transformed.
 * ----------------------------------------------------------------------------------------------- */

export const queueMessageSchema = z.union([
  domainCommandSchema,
  domainEventSchema,
  r2EventTransform,
])
