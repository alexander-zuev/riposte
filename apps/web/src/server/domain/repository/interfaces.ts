import type {
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
  SaveStripeDisputeContextInput,
  StripeDisputeContext,
} from '@server/domain/disputes'
import type {
  RefreshStripeCredentialsInput,
  StripeConnection,
  StripeConnectionWithCredentials,
  UpsertStripeConnectionInput,
} from '@server/domain/stripe'
import type { DbOutbox } from '@server/infrastructure/db'
import type { Result } from 'better-result'

export type DisputeCaseListPage = Omit<ListDisputeCasesResult, 'sync'>

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
}

/* -------------------------------------------------------------------------------------------------
 * Stripe Dispute Context Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IStripeDisputeContextRepository {
  findByDisputeCaseId: (
    disputeCaseId: string,
  ) => Promise<Result<StripeDisputeContext | null, DatabaseError>>
  save: (
    input: SaveStripeDisputeContextInput,
  ) => Promise<Result<StripeDisputeContext, DatabaseError>>
}

/* -------------------------------------------------------------------------------------------------
 * Dispute Evidence Packet Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IDisputeEvidencePacketRepository {
  findLatestByDisputeCaseId: (input: {
    userId: UUIDv4
    disputeCaseId: string
  }) => Promise<Result<DisputeEvidencePacket | null, DatabaseError>>
  save: (packet: DisputeEvidencePacket) => Promise<Result<DisputeEvidencePacket, DatabaseError>>
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
