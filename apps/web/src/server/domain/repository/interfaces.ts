import type {
  BlobStorageError,
  CredentialEncryptionError,
  DatabaseError,
  DisputeCaseActivity,
  DisputeCaseMessage,
  DomainEvent,
  DuplicateMessageError,
  DuplicateProductUrlError,
  EntityNotFoundError,
  JoinWaitlist,
  GetDisputeCaseActivity,
  ListDisputeCaseActivity,
  ListDisputeCases,
  ListDisputeCasesResult,
  DisputeSyncState,
  SaveDisputeCaseMessage,
  UUIDv4,
} from '@riposte/core'
import type { ProductAppDataSource } from '@server/domain/app-data-sources'
import type { DisputePlaybook } from '@server/domain/dispute-playbooks'
import type {
  DisputeCase,
  DisputeCollectedEvidence,
  DisputeEvidencePacket,
  StripeDisputeContext,
} from '@server/domain/disputes'
import type {
  NotificationChannelPreference,
  NotificationRecipient,
  SetNotificationChannelPreferenceInput,
} from '@server/domain/notifications'
import type { Product } from '@server/domain/products'
import type {
  SlackConnection,
  SlackConnectionWithCredentials,
  UpsertSlackConnectionInput,
} from '@server/domain/slack'
import type {
  StripeConnection,
  StripeConnectionCredentials,
  StripeConnectionWithCredentials,
} from '@server/domain/stripe'
import type { DbOutbox } from '@server/infrastructure/db'
import type { Result } from 'better-result'

export type DisputeCaseListPage = Omit<ListDisputeCasesResult, 'sync'>

export type StripeDisputeSyncAccount = {
  userId: string
  stripeAccountId: string
  livemode: boolean
}

/* -------------------------------------------------------------------------------------------------
 * Product Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IProductRepository {
  findById: (id: UUIDv4) => Promise<Result<Product | null, DatabaseError>>
  findByUserId: (userId: string) => Promise<Result<Product[], DatabaseError>>
  save: (product: Product) => Promise<Result<Product, DatabaseError | DuplicateProductUrlError>>
  delete: (product: Product) => Promise<Result<void, DatabaseError>>
}

export interface IProductAppDataSourceRepository {
  save: (source: ProductAppDataSource) => Promise<Result<ProductAppDataSource, DatabaseError>>
  findByProductId: (productId: UUIDv4) => Promise<Result<ProductAppDataSource[], DatabaseError>>
  findByProductIdAndMcpServerId: (input: {
    productId: UUIDv4
    mcpServerId: string
  }) => Promise<Result<ProductAppDataSource | null, DatabaseError>>
  delete: (source: ProductAppDataSource) => Promise<Result<void, DatabaseError>>
}

/* -------------------------------------------------------------------------------------------------
 * Dispute Playbook Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IDisputePlaybookRepository {
  save: (playbook: DisputePlaybook) => Promise<Result<DisputePlaybook, DatabaseError>>
  findLatestForProduct: (
    productId: UUIDv4,
  ) => Promise<Result<DisputePlaybook | null, DatabaseError>>
  deleteForProduct: (productId: UUIDv4) => Promise<Result<void, DatabaseError>>
}

/* -------------------------------------------------------------------------------------------------
 * Dispute Case Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IDisputeCaseRepository {
  findById: (id: string) => Promise<Result<DisputeCase | null, DatabaseError>>
  findByUserProductAndId: (input: {
    userId: string
    productId: UUIDv4
    disputeCaseId: string
  }) => Promise<Result<DisputeCase | null, DatabaseError>>
  findByIds: (ids: readonly string[]) => Promise<Result<Map<string, DisputeCase>, DatabaseError>>
  listForUser: (
    input: Omit<ListDisputeCases, 'type' | 'name'>,
  ) => Promise<Result<DisputeCaseListPage, DatabaseError>>
  countActionableForProduct: (input: {
    userId: string
    productId: UUIDv4
  }) => Promise<Result<number, DatabaseError>>
  save: (disputeCase: DisputeCase) => Promise<Result<DisputeCase, DatabaseError>>
  saveBatch: (disputeCases: readonly DisputeCase[]) => Promise<Result<void, DatabaseError>>
}

export interface IDisputeCollectedEvidenceRepository {
  findByDisputeCaseId: (
    disputeCaseId: string,
  ) => Promise<Result<DisputeCollectedEvidence | null, DatabaseError>>
  save: (
    evidence: DisputeCollectedEvidence,
  ) => Promise<Result<DisputeCollectedEvidence, DatabaseError>>
}

/* -------------------------------------------------------------------------------------------------
 * Dispute Case Message Repository
 * One row per agent turn: the evidence-collection loop's assembled UIMessage.
 * `save` upserts on the message id, so the per-step and turn-finish writes
 * overwrite the same row as the message grows.
 * ------------------------------------------------------------------------------------------------- */

export interface IDisputeCaseMessageRepository {
  save: (
    input: Omit<SaveDisputeCaseMessage, 'id' | 'type' | 'name' | 'userId'>,
  ) => Promise<Result<void, DatabaseError>>
  getCaseMessages: (
    input: Omit<GetDisputeCaseActivity, 'type' | 'name' | 'userId'>,
  ) => Promise<Result<DisputeCaseMessage[], DatabaseError>>
  listCaseActivity: (
    input: Omit<ListDisputeCaseActivity, 'type' | 'name' | 'userId'>,
  ) => Promise<Result<DisputeCaseActivity[], DatabaseError>>
}

/* -------------------------------------------------------------------------------------------------
 * Stripe Dispute Sync State Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IStripeDisputeSyncStateRepository {
  findForUser: (userId: string) => Promise<Result<DisputeSyncState, DatabaseError>>
  findForAccount: (input: {
    stripeAccountId: string
    livemode: boolean
  }) => Promise<Result<DisputeSyncState, DatabaseError>>
  markSynced: (input: {
    userId: string
    stripeAccountId: string
    livemode: boolean
    syncedAt: Date
  }) => Promise<Result<void, DatabaseError>>
  findDueAccounts: (input: {
    dueBefore: Date
    limit: number
  }) => Promise<Result<StripeDisputeSyncAccount[], DatabaseError>>
}

/* -------------------------------------------------------------------------------------------------
 * Stripe Dispute Context Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IStripeDisputeContextRepository {
  findByDisputeCaseId: (
    disputeCaseId: string,
  ) => Promise<Result<StripeDisputeContext | null, DatabaseError>>
  save: (context: StripeDisputeContext) => Promise<Result<StripeDisputeContext, DatabaseError>>
}

/* -------------------------------------------------------------------------------------------------
 * Dispute Evidence Packet Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IDisputeEvidencePacketRepository {
  findByIdForCase: (input: {
    userId: UUIDv4
    disputeCaseId: string
    evidencePacketId: UUIDv4
  }) => Promise<Result<DisputeEvidencePacket | null, DatabaseError>>
  findLatestByDisputeCaseId: (input: {
    userId: UUIDv4
    disputeCaseId: string
  }) => Promise<Result<DisputeEvidencePacket | null, DatabaseError>>
  save: (packet: DisputeEvidencePacket) => Promise<Result<DisputeEvidencePacket, DatabaseError>>
}

/* -------------------------------------------------------------------------------------------------
 * Dispute Evidence Artifact Blob Repository
 * ------------------------------------------------------------------------------------------------- */

export type SaveDisputeEvidenceArtifactBlobInput = {
  r2Key: string
  bytes: Uint8Array
  contentType: string
}

export type DisputeEvidenceArtifactBlob = {
  r2Key: string
  contentType: string
  byteSize: number
  etag: string
}

export type DisputeEvidenceArtifactBlobBody = DisputeEvidenceArtifactBlob & {
  bytes: Uint8Array
}

export interface IDisputeEvidenceArtifactBlobRepository {
  get: (input: {
    r2Key: string
  }) => Promise<Result<DisputeEvidenceArtifactBlobBody | null, BlobStorageError>>
  save: (
    input: SaveDisputeEvidenceArtifactBlobInput,
  ) => Promise<Result<DisputeEvidenceArtifactBlob, BlobStorageError>>
}

/* -------------------------------------------------------------------------------------------------
 * Stripe Connection Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IStripeConnectionRepository {
  save: (connection: StripeConnection) => Promise<Result<StripeConnection, DatabaseError>>

  saveWithCredentials: (
    connection: StripeConnection,
    credentials: StripeConnectionCredentials,
  ) => Promise<Result<StripeConnection, DatabaseError | CredentialEncryptionError>>

  findByStripeAccountId: (
    stripeAccountId: string,
  ) => Promise<Result<StripeConnection | null, DatabaseError>>

  findLatestByUserId: (userId: string) => Promise<Result<StripeConnection | null, DatabaseError>>

  findByProductId: (productId: UUIDv4) => Promise<Result<StripeConnection | null, DatabaseError>>

  findWithCredentialsByStripeAccountId: (
    stripeAccountId: string,
  ) => Promise<
    Result<StripeConnectionWithCredentials | null, DatabaseError | CredentialEncryptionError>
  >
}

/* -------------------------------------------------------------------------------------------------
 * Slack Connection Repository
 * ------------------------------------------------------------------------------------------------- */

export interface ISlackConnectionRepository {
  upsertInstalledConnection: (
    input: UpsertSlackConnectionInput,
  ) => Promise<Result<SlackConnection, DatabaseError | CredentialEncryptionError>>

  findLatestByUserId: (userId: string) => Promise<Result<SlackConnection | null, DatabaseError>>

  findWithCredentialsByUserId: (
    userId: string,
  ) => Promise<
    Result<SlackConnectionWithCredentials | null, DatabaseError | CredentialEncryptionError>
  >

  markFailedByTeamId: (input: {
    teamId: string
    failureReason: string
    failedAt: Date
  }) => Promise<Result<SlackConnection[], DatabaseError>>
}

/* -------------------------------------------------------------------------------------------------
 * Notification Preference Repository
 * ------------------------------------------------------------------------------------------------- */

export interface INotificationPreferenceRepository {
  findForUser: (userId: string) => Promise<Result<NotificationChannelPreference[], DatabaseError>>

  findRecipientByUserId: (
    userId: string,
  ) => Promise<Result<NotificationRecipient | null, DatabaseError>>

  setChannelEnabled: (
    input: SetNotificationChannelPreferenceInput,
  ) => Promise<Result<NotificationChannelPreference, DatabaseError>>
}

/* -------------------------------------------------------------------------------------------------
 * Waitlist Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IWaitlistRepository {
  add: (command: JoinWaitlist) => Promise<Result<{ alreadyExists: boolean }, DatabaseError>>
}

/* -------------------------------------------------------------------------------------------------
 * Outbox Repository
 * ------------------------------------------------------------------------------------------------- */

/**
 * UoW-facing outbox writes — run inside a handler's transaction (`Tx`):
 * persist the events the handler produced + record the idempotency claim.
 */
export interface IOutboxWriter {
  persistEvents: (events: DomainEvent[]) => Promise<Result<void, DatabaseError>>
  assertMessageNotProcessed: (
    msgId: string,
  ) => Promise<Result<{ id: string }[], DatabaseError | DuplicateMessageError>>
}

/**
 * Relay-facing drain — machinery that runs on its own transaction outside any UoW:
 * read undispatched rows (FOR UPDATE SKIP LOCKED) + mark them dispatched.
 */
export interface IOutboxRelayStore {
  retrievePending: (batchSize: number) => Promise<Result<DbOutbox[], DatabaseError>>
  publishPending: (pending: DbOutbox[]) => Promise<Result<UUIDv4[], DatabaseError>>
}

/** The single implementation class and test mocks satisfy both roles. */
export type IOutboxRepository = IOutboxWriter & IOutboxRelayStore
