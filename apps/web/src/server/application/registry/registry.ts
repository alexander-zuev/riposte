import {
  getSessionStatus,
  handleUserSignedUp,
  sendMagicLink,
  sendWelcomeEmail,
} from '@server/application/handlers/auth-handler'
import { getConnectionsStatus } from '@server/application/handlers/connection-handler'
import { listDisputeCases } from '@server/application/handlers/dispute-case-handler'
import {
  collectDisputeEvidence,
  enrichDisputeContext,
  generateEvidencePacket,
  routeDisputeSubmissionPolicy,
  startDisputeAgentWorkflow,
  submitDisputeResponse,
  triageDisputeCaseHandler,
} from '@server/application/handlers/dispute-workflow-handler'
import { getStripeAppSettings, syncDisputes } from '@server/application/handlers/stripe-app-handler'
import { handleStripeOAuthCallback } from '@server/application/handlers/stripe-oauth-handler'
import {
  handleDisputeClosed,
  handleDisputeCreated,
  handleDisputeFundsReinstated,
  handleDisputeFundsWithdrawn,
  handleDisputeUpdated,
  handleStripeAppAuthorized,
  handleStripeAppDeauthorized,
} from '@server/application/handlers/stripe-webhook-handler'
import { joinWaitlist } from '@server/application/handlers/waitlist-handler'

import type { CommandRegistry, EventRegistry, MessageRegistry, QueryRegistry } from './types'

export const COMMAND_HANDLERS = {
  JoinWaitlist: joinWaitlist,
  SendMagicLink: sendMagicLink,
  SendWelcomeEmail: sendWelcomeEmail,
  IngestDisputeCreated: handleDisputeCreated,
  IngestDisputeUpdated: handleDisputeUpdated,
  IngestDisputeClosed: handleDisputeClosed,
  IngestDisputeFundsReinstated: handleDisputeFundsReinstated,
  IngestDisputeFundsWithdrawn: handleDisputeFundsWithdrawn,
  SyncDisputes: syncDisputes,
  HandleStripeAppAuthorized: handleStripeAppAuthorized,
  HandleStripeAppDeauthorized: handleStripeAppDeauthorized,
  HandleStripeOAuthCallback: handleStripeOAuthCallback,
  TriageDisputeCase: triageDisputeCaseHandler,
  EnrichDisputeContext: enrichDisputeContext,
  CollectDisputeEvidence: collectDisputeEvidence,
  GenerateEvidencePacket: generateEvidencePacket,
  RouteDisputeSubmissionPolicy: routeDisputeSubmissionPolicy,
  SubmitDisputeResponse: submitDisputeResponse,
} satisfies CommandRegistry

export const EVENT_HANDLERS = {
  DisputeCaseReceived: [
    { id: 'dispute.startDisputeAgentWorkflow', handle: startDisputeAgentWorkflow },
  ],
  DisputeCaseCompleted: [],
  DisputeCaseFailed: [],
  UserSignedUp: [{ id: 'auth.handleUserSignedUp', handle: handleUserSignedUp }],
} satisfies EventRegistry

export const QUERY_HANDLERS = {
  GetSessionStatus: getSessionStatus,
  GetConnectionsStatus: getConnectionsStatus,
  GetStripeAppSettings: getStripeAppSettings,
  ListDisputeCases: listDisputeCases,
} satisfies QueryRegistry

export const defaultRegistry = {
  commands: COMMAND_HANDLERS,
  events: EVENT_HANDLERS,
  queries: QUERY_HANDLERS,
} satisfies MessageRegistry
