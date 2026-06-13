import {
  reconcileMcpState,
  syncProductAppDataSource,
} from '@server/application/handlers/app-data-source-handler'
import {
  getSessionStatus,
  handleUserSignedUp,
  sendMagicLink,
  sendWelcomeEmail,
} from '@server/application/handlers/auth-handler'
import { getChatMessages } from '@server/application/handlers/chat-handler'
import { getConnectionsStatus } from '@server/application/handlers/connection-handler'
import {
  countActionableDisputeCases,
  getDisputeCaseStatus,
  listDisputeCases,
  listStripeDisputesForProduct,
} from '@server/application/handlers/dispute-case-handler'
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
  SyncProductAppDataSource: syncProductAppDataSource,
  RestartProductSetup: restartProductSetup,
  WriteDisputePlaybook: writeDisputePlaybook,
  EditDisputePlaybook: editDisputePlaybook,
  UpdateProduct: updateProduct,
  DeleteProduct: deleteProduct,
} satisfies CommandRegistry

export const EVENT_HANDLERS = {
  DisputeCaseReceived: [
    { id: 'dispute.startDisputeAgentWorkflow', mode: 'state', handle: startDisputeAgentWorkflow },
    {
      id: 'notifications.notifyOnDisputeCaseReceived',
      mode: 'state',
      handle: notifyOnDisputeCaseReceived,
    },
  ],
  DisputeCaseCompleted: [
    {
      id: 'notifications.notifyOnDisputeCaseCompleted',
      mode: 'state',
      handle: notifyOnDisputeCaseCompleted,
    },
  ],
  DisputeCaseFailed: [
    {
      id: 'notifications.notifyOnDisputeCaseFailed',
      mode: 'state',
      handle: notifyOnDisputeCaseFailed,
    },
  ],
  DisputeEvidenceCollectionCompleted: [
    {
      id: 'dispute.sendEvidenceCollectionWorkflowEvent',
      mode: 'state',
      handle: sendEvidenceCollectionWorkflowEvent,
    },
  ],
  DisputeEvidenceCollectionNeedsInput: [
    {
      id: 'dispute.sendEvidenceCollectionWorkflowEvent',
      mode: 'state',
      handle: sendEvidenceCollectionWorkflowEvent,
    },
  ],
  DisputeEvidenceCollectionFailed: [
    {
      id: 'dispute.sendEvidenceCollectionWorkflowEvent',
      mode: 'state',
      handle: sendEvidenceCollectionWorkflowEvent,
    },
  ],
  ScheduledDisputeSyncDue: [
    {
      id: 'stripeApp.fanOutScheduledDisputeSync',
      mode: 'state',
      handle: fanOutScheduledDisputeSync,
    },
  ],
  UserSignedUp: [{ id: 'auth.handleUserSignedUp', mode: 'state', handle: handleUserSignedUp }],
  ProductCreated: [
    { id: 'productSetup.notifyChanged', mode: 'state', handle: notifyProductSetupChanged },
  ],
  StripeConnectionCreated: [
    { id: 'agent.signalStripeConnected', mode: 'state', handle: handleStripeConnectionCreated },
    { id: 'productSetup.notifyChanged', mode: 'state', handle: notifyProductSetupChanged },
  ],
  ProductAppDataSourceRegistered: [
    { id: 'productSetup.notifyChanged', mode: 'state', handle: notifyProductSetupChanged },
  ],
  ProductAppDataSourceDisconnected: [
    { id: 'productSetup.notifyChanged', mode: 'state', handle: notifyProductSetupChanged },
  ],
  ProductUpdated: [
    { id: 'productSetup.notifyChanged', mode: 'state', handle: notifyProductSetupChanged },
  ],
  DisputePlaybookCreated: [
    { id: 'productSetup.notifyChanged', mode: 'state', handle: notifyProductSetupChanged },
  ],
  DisputePlaybookRevised: [
    { id: 'productSetup.notifyChanged', mode: 'state', handle: notifyProductSetupChanged },
  ],
  ProductSetupCompleted: [
    { id: 'productSetup.notifyChanged', mode: 'state', handle: notifyProductSetupChanged },
  ],
  McpOAuthRefreshFailed: [
    {
      id: 'product.handleMcpOAuthRefreshFailed',
      mode: 'state',
      handle: handleMcpOAuthRefreshFailed,
    },
  ],
  // Effect subscriber: runs OUTSIDE the UoW (no tx, no claim). `reconcileMcpState` RPCs the
  // agent DO and fans out reconcile commands — it must not be wrapped in a transaction.
  McpStateChanged: [
    { id: 'appDataSources.reconcileMcpState', mode: 'effect', handle: reconcileMcpState },
  ],
} satisfies EventRegistry

export const QUERY_HANDLERS = {
  GetSessionStatus: getSessionStatus,
  GetConnectionsStatus: getConnectionsStatus,
  GetStripeAppSettings: getStripeAppSettings,
  ListDisputeCases: listDisputeCases,
  CountActionableDisputeCases: countActionableDisputeCases,
  ListStripeDisputesForProduct: listStripeDisputesForProduct,
  GetDisputeCaseStatus: getDisputeCaseStatus,
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
