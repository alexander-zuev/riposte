import {
  getSessionStatus,
  handleUserSignedUp,
  sendMagicLink,
  sendWelcomeEmail,
} from '@server/application/handlers/auth-handler'
import { getChatMessages } from '@server/application/handlers/chat-handler'
import { getConnectionsStatus } from '@server/application/handlers/connection-handler'
import { listDisputeCases } from '@server/application/handlers/dispute-case-handler'
import {
  getDisputeCaseActivity,
  listDisputeCaseActivity,
  saveDisputeCaseMessage,
} from '@server/application/handlers/dispute-case-message-handler'
import { startDryRun } from '@server/application/handlers/dispute-dry-run-handler'
import {
  completeDisputeEvidenceCollection,
  decideDisputeSubmissionPolicy,
  enrichDisputeContext,
  failDisputeCase,
  generateEvidencePacket,
  handleDisputeSubmissionApprovalResponse,
  sendEvidenceCollectionWorkflowEvent,
  startDisputeEvidenceCollection,
  startDisputeAgentWorkflow,
  submitDisputeResponse,
  triageDisputeCaseHandler,
} from '@server/application/handlers/dispute-workflow-handler'
import {
  handleSlackAppUninstalled,
  handleSlackOAuthCallback,
  notifyOnDisputeCaseCompleted,
  notifyOnDisputeCaseFailed,
  notifyOnDisputeCaseReceived,
  setNotificationChannelPreference,
} from '@server/application/handlers/notification-handler'
import {
  createProduct,
  deleteProduct,
  disconnectProductAppDataSource,
  getProductSetupState,
  handleMcpOAuthRefreshFailed,
  listProducts,
  notifyProductSetupChanged,
  readProductDisputeSetup,
  readProductSetupSnapshot,
  registerProductAppDataSource,
  restartProductSetup,
  writeDisputePlaybook,
  editDisputePlaybook,
  readDisputePlaybook,
  updateProduct,
} from '@server/application/handlers/product-handler'
import {
  fanOutScheduledDisputeSync,
  getStripeAppSettings,
  syncDisputes,
} from '@server/application/handlers/stripe-app-handler'
import {
  buildStripeOAuthInstallUrl,
  handleStripeConnectionCreated,
  handleStripeOAuthCallback,
} from '@server/application/handlers/stripe-oauth-handler'
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
  BuildStripeOAuthInstallUrl: buildStripeOAuthInstallUrl,
  HandleStripeOAuthCallback: handleStripeOAuthCallback,
  HandleSlackOAuthCallback: handleSlackOAuthCallback,
  HandleSlackAppUninstalled: handleSlackAppUninstalled,
  SetNotificationChannelPreference: setNotificationChannelPreference,
  TriageDisputeCase: triageDisputeCaseHandler,
  EnrichDisputeContext: enrichDisputeContext,
  StartDisputeEvidenceCollection: startDisputeEvidenceCollection,
  StartDryRun: startDryRun,
  CompleteDisputeEvidenceCollection: completeDisputeEvidenceCollection,
  SaveDisputeCaseMessage: saveDisputeCaseMessage,
  GenerateEvidencePacket: generateEvidencePacket,
  DecideDisputeSubmissionPolicy: decideDisputeSubmissionPolicy,
  SubmitDisputeResponse: submitDisputeResponse,
  HandleDisputeSubmissionApprovalResponse: handleDisputeSubmissionApprovalResponse,
  FailDisputeCase: failDisputeCase,
  CreateProduct: createProduct,
  RegisterProductAppDataSource: registerProductAppDataSource,
  DisconnectProductAppDataSource: disconnectProductAppDataSource,
  RestartProductSetup: restartProductSetup,
  WriteDisputePlaybook: writeDisputePlaybook,
  EditDisputePlaybook: editDisputePlaybook,
  UpdateProduct: updateProduct,
  DeleteProduct: deleteProduct,
} satisfies CommandRegistry

export const EVENT_HANDLERS = {
  DisputeCaseReceived: [
    { id: 'dispute.startDisputeAgentWorkflow', handle: startDisputeAgentWorkflow },
    { id: 'notifications.notifyOnDisputeCaseReceived', handle: notifyOnDisputeCaseReceived },
  ],
  DisputeCaseCompleted: [
    { id: 'notifications.notifyOnDisputeCaseCompleted', handle: notifyOnDisputeCaseCompleted },
  ],
  DisputeCaseFailed: [
    { id: 'notifications.notifyOnDisputeCaseFailed', handle: notifyOnDisputeCaseFailed },
  ],
  DisputeEvidenceCollectionCompleted: [
    {
      id: 'dispute.sendEvidenceCollectionWorkflowEvent',
      handle: sendEvidenceCollectionWorkflowEvent,
    },
  ],
  DisputeEvidenceCollectionNeedsInput: [
    {
      id: 'dispute.sendEvidenceCollectionWorkflowEvent',
      handle: sendEvidenceCollectionWorkflowEvent,
    },
  ],
  DisputeEvidenceCollectionFailed: [
    {
      id: 'dispute.sendEvidenceCollectionWorkflowEvent',
      handle: sendEvidenceCollectionWorkflowEvent,
    },
  ],
  ScheduledDisputeSyncDue: [
    { id: 'stripeApp.fanOutScheduledDisputeSync', handle: fanOutScheduledDisputeSync },
  ],
  UserSignedUp: [{ id: 'auth.handleUserSignedUp', handle: handleUserSignedUp }],
  ProductCreated: [{ id: 'productSetup.notifyChanged', handle: notifyProductSetupChanged }],
  StripeConnectionCreated: [
    { id: 'agent.signalStripeConnected', handle: handleStripeConnectionCreated },
    { id: 'productSetup.notifyChanged', handle: notifyProductSetupChanged },
  ],
  ProductAppDataSourceRegistered: [
    { id: 'productSetup.notifyChanged', handle: notifyProductSetupChanged },
  ],
  ProductAppDataSourceDisconnected: [
    { id: 'productSetup.notifyChanged', handle: notifyProductSetupChanged },
  ],
  ProductUpdated: [{ id: 'productSetup.notifyChanged', handle: notifyProductSetupChanged }],
  DisputePlaybookCreated: [{ id: 'productSetup.notifyChanged', handle: notifyProductSetupChanged }],
  DisputePlaybookRevised: [{ id: 'productSetup.notifyChanged', handle: notifyProductSetupChanged }],
  ProductSetupCompleted: [{ id: 'productSetup.notifyChanged', handle: notifyProductSetupChanged }],
  McpOAuthRefreshFailed: [
    { id: 'product.handleMcpOAuthRefreshFailed', handle: handleMcpOAuthRefreshFailed },
  ],
} satisfies EventRegistry

export const QUERY_HANDLERS = {
  GetSessionStatus: getSessionStatus,
  GetConnectionsStatus: getConnectionsStatus,
  GetStripeAppSettings: getStripeAppSettings,
  ListDisputeCases: listDisputeCases,
  ListDisputeCaseActivity: listDisputeCaseActivity,
  GetDisputeCaseActivity: getDisputeCaseActivity,
  ReadDisputePlaybook: readDisputePlaybook,
  ListProducts: listProducts,
  GetProductSetupState: getProductSetupState,
  ReadProductSetupSnapshot: readProductSetupSnapshot,
  ReadProductDisputeSetup: readProductDisputeSetup,
  GetChatMessages: getChatMessages,
} satisfies QueryRegistry

export const defaultRegistry = {
  commands: COMMAND_HANDLERS,
  events: EVENT_HANDLERS,
  queries: QUERY_HANDLERS,
} satisfies MessageRegistry
