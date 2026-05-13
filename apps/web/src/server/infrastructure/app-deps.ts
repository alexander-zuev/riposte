import type { DatabaseError, DOUnreachableError, DuplicateMessageError } from '@riposte/core'
import type { IMessageBus } from '@server/application/message-bus/message-bus'
import { MessageBus } from '@server/application/message-bus/message-bus'
import { executeUoW } from '@server/application/message-bus/unit-of-work'
import { ConnectionManager, type IConnectionManager } from '@server/domain/connections'
import type {
  IDisputeCaseRepository,
  IDisputeEvidencePacketRepository,
  IOutboxRepository,
  IStripeConnectionRepository,
  IStripeDisputeContextRepository,
  IStripeDisputeSyncStateRepository,
  IWaitlistRepository,
} from '@server/domain/repository/interfaces'
import {
  DisputeAgentClient,
  type IDisputeAgentClient,
} from '@server/infrastructure/agents/dispute-agent-client'
import type { ICredentialEncryptionService } from '@server/infrastructure/credentials/credential-encryption'
import { CredentialEncryptionService } from '@server/infrastructure/credentials/credential-encryption'
import type { DrizzleDb } from '@server/infrastructure/db'
import { createDatabase } from '@server/infrastructure/db'
import type { IEmailService } from '@server/infrastructure/email/interfaces'
import { ResendEmailService } from '@server/infrastructure/email/resend-email-service'
import { KVClient } from '@server/infrastructure/kv/kv-client'
import type { IOutboxRelay } from '@server/infrastructure/queues/outbox-relay'
import { OutboxRelay } from '@server/infrastructure/queues/outbox-relay'
import {
  triggerOutboxRelay,
  wakeOutboxRelay,
} from '@server/infrastructure/queues/outbox-relay-wakeup'
import type { IQueueClient } from '@server/infrastructure/queues/queue-client'
import { QueueClient } from '@server/infrastructure/queues/queue-client'
import { DisputeCaseRepository } from '@server/infrastructure/repositories/dispute-case.repository'
import { DisputeEvidencePacketRepository } from '@server/infrastructure/repositories/dispute-evidence-packet.repository'
import { OutboxRepository } from '@server/infrastructure/repositories/outbox.repository'
import { StripeConnectionRepository } from '@server/infrastructure/repositories/stripe-connection.repository'
import { StripeDisputeContextRepository } from '@server/infrastructure/repositories/stripe-dispute-context.repository'
import { StripeDisputeSyncStateRepository } from '@server/infrastructure/repositories/stripe-dispute-sync-state.repository'
import { WaitlistRepository } from '@server/infrastructure/repositories/waitlist.repository'
import {
  StripeClientProvider,
  type IStripeClientProvider,
} from '@server/infrastructure/stripe/stripe-client-provider'
import type { Result } from 'better-result'

type WaitUntilContext = Pick<ExecutionContext, 'waitUntil'>

export type AppDeps = {
  env: Env
  ctx: WaitUntilContext

  db: () => DrizzleDb

  kv: {
    auth: KVClient
    cache: KVClient
  }

  repos: {
    disputeCases: (tx: DrizzleDb) => IDisputeCaseRepository
    disputeEvidencePackets: (tx: DrizzleDb) => IDisputeEvidencePacketRepository
    outbox: (tx: DrizzleDb) => IOutboxRepository
    stripeConnections: (tx: DrizzleDb) => IStripeConnectionRepository
    stripeDisputeContexts: (tx: DrizzleDb) => IStripeDisputeContextRepository
    stripeDisputeSyncState: (tx: DrizzleDb) => IStripeDisputeSyncStateRepository
    waitlist: (tx: DrizzleDb) => IWaitlistRepository
  }

  uow: {
    execute: <T, E>(
      work: (tx: DrizzleDb) => Promise<Result<T, E>>,
      msgId: string,
    ) => Promise<Result<T, E | DatabaseError | DuplicateMessageError>>
  }

  services: {
    messageBus: () => IMessageBus
    connectionManager: () => IConnectionManager
    queueClient: () => IQueueClient
    credentialEncryption: () => ICredentialEncryptionService
    disputeAgentClient: () => IDisputeAgentClient
    email: () => IEmailService
    stripeClientProvider: () => IStripeClientProvider
    outboxRelay: () => IOutboxRelay
  }

  hooks: {
    onEventsCommitted: () => void
    triggerOutboxRelay: () => Promise<Result<void, DOUnreachableError>>
  }
}

export function createAppDeps(env: Env, ctx: WaitUntilContext): AppDeps {
  const deps: AppDeps = {
    env,
    ctx,
    db: once(() => createDatabase(env)),
    kv: {
      auth: new KVClient(env.AUTH_KV),
      cache: new KVClient(env.CACHE_KV),
    },
    repos: {
      disputeCases: (tx) => new DisputeCaseRepository(tx),
      disputeEvidencePackets: (tx) => new DisputeEvidencePacketRepository(tx),
      outbox: (tx) => new OutboxRepository(tx),
      stripeConnections: (tx) =>
        new StripeConnectionRepository(tx, deps.services.credentialEncryption()),
      stripeDisputeContexts: (tx) => new StripeDisputeContextRepository(tx),
      stripeDisputeSyncState: (tx) => new StripeDisputeSyncStateRepository(tx),
      waitlist: (tx) => new WaitlistRepository(tx),
    },
    uow: {
      execute: async (work, msgId) => executeUoW(deps, work, msgId),
    },
    services: {
      messageBus: once<IMessageBus>(() => new MessageBus(deps)),
      connectionManager: once<IConnectionManager>(
        () => new ConnectionManager(deps.repos.stripeConnections(deps.db())),
      ),
      queueClient: once<IQueueClient>(() => new QueueClient(env)),
      credentialEncryption: once<ICredentialEncryptionService>(
        () =>
          new CredentialEncryptionService({
            currentKeyVersion: env.CURRENT_CREDENTIAL_ENCRYPTION_KEY_VERSION,
            keys: {
              v1: env.CREDENTIAL_ENCRYPTION_KEY_V1,
            },
          }),
      ),
      disputeAgentClient: once<IDisputeAgentClient>(() => new DisputeAgentClient(env)),
      email: once<IEmailService>(() => new ResendEmailService(env.RESEND_API_KEY)),
      stripeClientProvider: once<IStripeClientProvider>(
        () => new StripeClientProvider(deps.repos.stripeConnections(deps.db())),
      ),
      outboxRelay: once<IOutboxRelay>(
        () => new OutboxRelay(deps.db(), deps.services.queueClient(), deps.repos.outbox),
      ),
    },
    hooks: {
      onEventsCommitted: () => {
        ctx.waitUntil(wakeOutboxRelay(env))
      },
      triggerOutboxRelay: async () => triggerOutboxRelay(env),
    },
  }

  return deps
}

function once<T>(factory: () => T): () => T {
  let value: T | undefined
  return () => (value ??= factory())
}
