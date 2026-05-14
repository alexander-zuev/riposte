import type {
  BlobStorageError,
  CredentialEncryptionError,
  DatabaseError,
  DomainEvent,
  DuplicateMessageError,
  JoinWaitlist,
  ListDisputeCases,
  ListDisputeCasesResult,
  DisputeSyncState,
  UUIDv4,
} from '@riposte/core'
import type {
  DisputeCase,
  DisputeEvidencePacket,
  StripeDisputeContext,
} from '@server/domain/disputes'
import type {
  NotificationChannelPreference,
  NotificationRecipient,
  SetNotificationChannelPreferenceInput,
} from '@server/domain/notifications'
import type {
  SlackConnection,
  SlackConnectionWithCredentials,
  UpsertSlackConnectionInput,
} from '@server/domain/slack'
import type {
  RefreshStripeCredentialsInput,
  StripeConnection,
  StripeConnectionWithCredentials,
  UpsertStripeConnectionInput,
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
 * Dispute Case Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IDisputeCaseRepository {
  findById: (id: string) => Promise<Result<DisputeCase | null, DatabaseError>>
  listForUser: (
    input: Omit<ListDisputeCases, 'type' | 'name'>,
  ) => Promise<Result<DisputeCaseListPage, DatabaseError>>
  save: (disputeCase: DisputeCase) => Promise<Result<DisputeCase, DatabaseError>>
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
  upsertConnectedAccount: (
    input: UpsertStripeConnectionInput,
  ) => Promise<Result<StripeConnection, DatabaseError | CredentialEncryptionError>>

  markRevokedByStripeAccountId: (input: {
    stripeAccountId: string
    stripeEventId: string
    revokedAt: Date
  }) => Promise<Result<StripeConnection | null, DatabaseError>>

  findByStripeAccountId: (
    stripeAccountId: string,
  ) => Promise<Result<StripeConnection | null, DatabaseError>>

  findLatestByUserId: (userId: string) => Promise<Result<StripeConnection | null, DatabaseError>>

  findWithCredentialsByStripeAccountId: (
    stripeAccountId: string,
  ) => Promise<
    Result<StripeConnectionWithCredentials | null, DatabaseError | CredentialEncryptionError>
  >

  refreshCredentials: (
    input: RefreshStripeCredentialsInput,
  ) => Promise<Result<StripeConnectionWithCredentials, DatabaseError | CredentialEncryptionError>>
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

export interface IOutboxRepository {
  persistEvents: (events: DomainEvent[]) => Promise<Result<void, DatabaseError>>
  assertMessageNotProcessed: (
    msgId: string,
  ) => Promise<Result<{ id: string }[], DatabaseError | DuplicateMessageError>>
  retrievePending: (batchSize: number) => Promise<Result<DbOutbox[], DatabaseError>>
  publishPending: (pending: DbOutbox[]) => Promise<Result<UUIDv4[], DatabaseError>>
}
