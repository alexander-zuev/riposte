import type {
  CredentialEncryptionError,
  DatabaseError,
  DomainEvent,
  DuplicateMessageError,
  UUIDv4,
} from '@riposte/core'
import type {
  StripeConnection,
  StripeConnectionWithCredentials,
  UpsertStripeConnectionInput,
} from '@server/domain/stripe'
import type { DbOutbox } from '@server/infrastructure/db'
import type { Result } from 'better-result'

/* -------------------------------------------------------------------------------------------------
 * Stripe Connection Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IStripeConnectionRepository {
  upsertConnectedAccount: (
    input: UpsertStripeConnectionInput,
  ) => Promise<Result<StripeConnection, DatabaseError | CredentialEncryptionError>>

  findByStripeAccountId: (
    stripeAccountId: string,
  ) => Promise<Result<StripeConnection | null, DatabaseError>>

  findLatestByUserId: (userId: string) => Promise<Result<StripeConnection | null, DatabaseError>>

  findWithCredentialsByStripeAccountId: (
    stripeAccountId: string,
  ) => Promise<
    Result<StripeConnectionWithCredentials | null, DatabaseError | CredentialEncryptionError>
  >
}

/* -------------------------------------------------------------------------------------------------
 * Waitlist Repository
 * ------------------------------------------------------------------------------------------------- */

export interface IWaitlistRepository {
  addEmail: (email: string) => Promise<Result<{ alreadyExists: boolean }, DatabaseError>>
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
