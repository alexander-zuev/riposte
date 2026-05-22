import { z } from 'zod'

import {
  getSessionStatusSchema,
  sendMagicLinkSchema,
  sendWelcomeEmailSchema,
  userSignedUpSchema,
} from '../auth/auth.messages'
import { getChatMessagesSchema } from '../chat'
import { getConnectionsStatusSchema } from '../connections'
import { disputePlaybookCreatedSchema } from '../dispute-playbooks'
import {
  ingestDisputeClosedSchema,
  ingestDisputeCreatedSchema,
  ingestDisputeFundsReinstatedSchema,
  ingestDisputeFundsWithdrawnSchema,
  ingestDisputeUpdatedSchema,
  collectDisputeEvidenceSchema,
  decideDisputeSubmissionPolicySchema,
  failDisputeCaseSchema,
  enrichDisputeContextSchema,
  generateEvidencePacketSchema,
  handleDisputeSubmissionApprovalResponseSchema,
  submitDisputeResponseSchema,
  syncDisputesSchema,
  triageDisputeCaseSchema,
} from '../disputes/dispute.commands'
import {
  disputeCaseCompletedSchema,
  disputeEvidencePacketCreatedSchema,
  disputeCaseFailedSchema,
  disputeCaseReceivedSchema,
  scheduledDisputeSyncDueSchema,
} from '../disputes/dispute.events'
import { getStripeAppSettingsSchema, listDisputeCasesSchema } from '../disputes/dispute.queries'
import {
  handleSlackAppUninstalledSchema,
  handleSlackOAuthCallbackSchema,
  setNotificationChannelPreferenceSchema,
} from '../notifications'
import {
  createProductSchema,
  deleteProductSchema,
  disconnectProductAppDataSourceSchema,
  getProductSetupStateSchema,
  listProductsSchema,
  productCreatedSchema,
  productAppDataSourceDisconnectedSchema,
  productAppDataSourceRegisteredSchema,
  productDeletedSchema,
  productDisabledSchema,
  productEnabledSchema,
  productSetupCompletedSchema,
  productUpdatedSchema,
  readProductOnboardingStateSchema,
  registerProductAppDataSourceSchema,
  restartProductSetupSchema,
  updateProductSchema,
} from '../products'
import { r2EventSchema, r2EventTransform } from '../storage/r2.messages'
import {
  buildStripeOAuthInstallUrlSchema,
  handleStripeAppAuthorizedSchema,
  handleStripeAppDeauthorizedSchema,
  handleStripeOAuthCallbackSchema,
  stripeConnectionCreatedSchema,
  stripeConnectionRevokedSchema,
  stripeConnectionTokenRefreshedSchema,
} from '../stripe'
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
  triageDisputeCaseSchema,
  enrichDisputeContextSchema,
  collectDisputeEvidenceSchema,
  generateEvidencePacketSchema,
  decideDisputeSubmissionPolicySchema,
  submitDisputeResponseSchema,
  handleDisputeSubmissionApprovalResponseSchema,
  failDisputeCaseSchema,
  handleStripeAppAuthorizedSchema,
  handleStripeAppDeauthorizedSchema,
  buildStripeOAuthInstallUrlSchema,
  handleStripeOAuthCallbackSchema,
  handleSlackOAuthCallbackSchema,
  handleSlackAppUninstalledSchema,
  setNotificationChannelPreferenceSchema,
  createProductSchema,
  registerProductAppDataSourceSchema,
  disconnectProductAppDataSourceSchema,
  restartProductSetupSchema,
  updateProductSchema,
  deleteProductSchema,
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
  disputeCaseCompletedSchema,
  disputeCaseFailedSchema,
  disputeEvidencePacketCreatedSchema,
  scheduledDisputeSyncDueSchema,
  productCreatedSchema,
  productAppDataSourceRegisteredSchema,
  productAppDataSourceDisconnectedSchema,
  productUpdatedSchema,
  productDeletedSchema,
  productDisabledSchema,
  productEnabledSchema,
  productSetupCompletedSchema,
  disputePlaybookCreatedSchema,
  stripeConnectionCreatedSchema,
  stripeConnectionRevokedSchema,
  stripeConnectionTokenRefreshedSchema,
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
  listDisputeCasesSchema,
  listProductsSchema,
  getProductSetupStateSchema,
  readProductOnboardingStateSchema,
  getChatMessagesSchema,
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
