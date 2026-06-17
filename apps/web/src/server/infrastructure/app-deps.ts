import type { DatabaseError, DOUnreachableError, DuplicateMessageError } from '@riposte/core'
import type { IMessageBus } from '@server/application/message-bus/message-bus'
import { MessageBus } from '@server/application/message-bus/message-bus'
import { executeUoW } from '@server/application/message-bus/unit-of-work'
import { ConnectionManager, type IConnectionManager } from '@server/domain/connections'
import {
  ProductSetupService,
  type IProductSetupService,
} from '@server/domain/products/product-setup.service'
import type {
  IDisputeCaseMessageRepository,
  IDisputeCaseRepository,
  IDisputeCollectedEvidenceRepository,
  IDisputeEvidenceArtifactBlobRepository,
  IDisputeEvidencePacketRepository,
  IDisputePlaybookRepository,
  INotificationPreferenceRepository,
  IOutboxWriter,
  IProductAppDataSourceRepository,
  IProductRepository,
  ISlackConnectionRepository,
  IStripeConnectionRepository,
  IStripeDisputeContextRepository,
  IStripeDisputeSyncStateRepository,
  IWaitlistRepository,
} from '@server/domain/repository/interfaces'
import {
  DisputeAgentClient,
  type IDisputeAgentClient,
} from '@server/infrastructure/agents/dispute-agent-client'
import {
  AnalyticsService,
  type IAnalyticsService,
} from '@server/infrastructure/analytics/analytics-service'
import type { ICredentialEncryptionService } from '@server/infrastructure/credentials/credential-encryption'
import { CredentialEncryptionService } from '@server/infrastructure/credentials/credential-encryption'
import type { DrizzleDb, ReadDb, Tx } from '@server/infrastructure/db'
import { createDatabase, transitionalRepoRead } from '@server/infrastructure/db'
import {
  AsyncGateClient,
  type IAsyncGateClient,
} from '@server/infrastructure/durable-objects/async-gate-client'
import {
  type IRateLimiterClient,
  RateLimiterClient,
} from '@server/infrastructure/durable-objects/rate-limiter-client'
import type { IEmailService } from '@server/infrastructure/email/interfaces'
import { ResendEmailService } from '@server/infrastructure/email/resend-email-service'
import { KVClient } from '@server/infrastructure/kv/kv-client'
import {
  type INotificationService,
  NotificationService,
} from '@server/infrastructure/notifications/notification-service'
import type { IOutboxRelay } from '@server/infrastructure/queues/outbox-relay'
import { OutboxRelay } from '@server/infrastructure/queues/outbox-relay'
import {
  triggerOutboxRelay,
  wakeOutboxRelay,
} from '@server/infrastructure/queues/outbox-relay-wakeup'
import type { IQueueClient } from '@server/infrastructure/queues/queue-client'
import { QueueClient } from '@server/infrastructure/queues/queue-client'
import { DisputeCaseMessageRepository } from '@server/infrastructure/repositories/dispute-case-message.repository'
import { DisputeCaseRepository } from '@server/infrastructure/repositories/dispute-case.repository'
import { DisputeCollectedEvidenceRepository } from '@server/infrastructure/repositories/dispute-collected-evidence.repository'
import { DisputeEvidenceArtifactBlobRepository } from '@server/infrastructure/repositories/dispute-evidence-artifact-blob.repository'
import { DisputeEvidencePacketRepository } from '@server/infrastructure/repositories/dispute-evidence-packet.repository'
import { DisputePlaybookRepository } from '@server/infrastructure/repositories/dispute-playbook.repository'
import { NotificationPreferenceRepository } from '@server/infrastructure/repositories/notification-preference.repository'
import { OutboxRepository } from '@server/infrastructure/repositories/outbox.repository'
import { ProductAppDataSourceRepository } from '@server/infrastructure/repositories/product-app-data-source.repository'
import { ProductRepository } from '@server/infrastructure/repositories/product.repository'
import { SlackConnectionRepository } from '@server/infrastructure/repositories/slack-connection.repository'
import { StripeConnectionRepository } from '@server/infrastructure/repositories/stripe-connection.repository'
import { StripeDisputeContextRepository } from '@server/infrastructure/repositories/stripe-dispute-context.repository'
import { StripeDisputeSyncStateRepository } from '@server/infrastructure/repositories/stripe-dispute-sync-state.repository'
import { WaitlistRepository } from '@server/infrastructure/repositories/waitlist.repository'
import {
  type ISlackOAuthService,
  SlackOAuthService,
} from '@server/infrastructure/slack/slack-oauth-client'
import {
  SlackWebhookNotifier,
  type ISlackWebhookNotifier,
} from '@server/infrastructure/slack/slack-webhook-notifier'
import {
  StripeClientProvider,
  type IStripeClientProvider,
} from '@server/infrastructure/stripe/stripe-client-provider'
import { JinaClient, type IJinaClient } from '@server/infrastructure/web/jina-client'
import type { Result } from 'better-result'

type WaitUntilContext = Pick<ExecutionContext, 'waitUntil'>

export type AppDeps = {
  env: Env
  ctx: WaitUntilContext

  db: () => DrizzleDb
  readDb: () => ReadDb

  kv: {
    auth: KVClient
    cache: KVClient
  }

  repos: {
    disputeCases: (tx: Tx) => IDisputeCaseRepository
    disputeCaseMessages: (tx: Tx) => IDisputeCaseMessageRepository
    disputeCollectedEvidence: (tx: Tx) => IDisputeCollectedEvidenceRepository
    disputeEvidenceArtifactBlobs: () => IDisputeEvidenceArtifactBlobRepository
    disputeEvidencePackets: (tx: Tx) => IDisputeEvidencePacketRepository
    disputePlaybooks: (tx: Tx) => IDisputePlaybookRepository
    notificationPreferences: (tx: Tx) => INotificationPreferenceRepository
    outbox: (tx: Tx) => IOutboxWriter
    productAppDataSources: (tx: Tx) => IProductAppDataSourceRepository
    products: (tx: Tx) => IProductRepository
    slackConnections: (tx: Tx) => ISlackConnectionRepository
    stripeConnections: (tx: Tx) => IStripeConnectionRepository
    stripeDisputeContexts: (tx: Tx) => IStripeDisputeContextRepository
    stripeDisputeSyncState: (tx: Tx) => IStripeDisputeSyncStateRepository
    waitlist: (tx: Tx) => IWaitlistRepository
  }

  uow: {
    execute: <T, E>(
      work: (tx: Tx) => Promise<Result<T, E>>,
      msgId: string,
    ) => Promise<Result<T, E | DatabaseError | DuplicateMessageError>>
  }

  services: {
    messageBus: () => IMessageBus
    connectionManager: () => IConnectionManager
    productSetup: () => IProductSetupService
    queueClient: () => IQueueClient
    asyncGate: () => IAsyncGateClient
    rateLimiter: () => IRateLimiterClient
    credentialEncryption: () => ICredentialEncryptionService
    disputeAgentClient: () => IDisputeAgentClient
    email: () => IEmailService
    // Per-call factory on purpose: runs inside the calling handler's transaction so its
    // writes commit atomically with it. Never memoize with once().
    notifications: (tx: Tx) => INotificationService
    slackOAuth: () => ISlackOAuthService
    slackWebhook: () => ISlackWebhookNotifier
    stripeClientProvider: () => IStripeClientProvider
    outboxRelay: () => IOutboxRelay
    analytics: () => IAnalyticsService
    jinaClient: () => IJinaClient
  }

  hooks: {
    onEventsCommitted: () => void
    triggerOutboxRelay: () => Promise<Result<void, DOUnreachableError>>
  }
}

export function createAppDeps(env: Env, ctx: WaitUntilContext): AppDeps {
  // Writable Drizzle handle for infrastructure adapters that own their tables.
  // Domain writes still go through deps.uow; read paths get deps.readDb().
  const db = once(() => createDatabase(env))

  const deps: AppDeps = {
    env,
    ctx,
    db,
    readDb: () => db(),
    kv: {
      auth: new KVClient(env.AUTH_KV),
      cache: new KVClient(env.CACHE_KV),
    },
    repos: {
      disputeCases: (tx) => new DisputeCaseRepository(tx),
      disputeCaseMessages: (tx) => new DisputeCaseMessageRepository(tx),
      disputeCollectedEvidence: (tx) => new DisputeCollectedEvidenceRepository(tx),
      disputeEvidenceArtifactBlobs: () =>
        new DisputeEvidenceArtifactBlobRepository(env.RIPOSTE_BUCKET),
      disputeEvidencePackets: (tx) => new DisputeEvidencePacketRepository(tx),
      disputePlaybooks: (tx) => new DisputePlaybookRepository(tx),
      notificationPreferences: (tx) => new NotificationPreferenceRepository(tx),
      outbox: (tx) => new OutboxRepository(tx),
      productAppDataSources: (tx) => new ProductAppDataSourceRepository(tx),
      products: (tx) => new ProductRepository(tx),
      slackConnections: (tx) =>
        new SlackConnectionRepository(tx, deps.services.credentialEncryption()),
      stripeConnections: (tx) =>
        new StripeConnectionRepository(tx, deps.services.credentialEncryption()),
      stripeDisputeContexts: (tx) => new StripeDisputeContextRepository(tx),
      stripeDisputeSyncState: (tx) => new StripeDisputeSyncStateRepository(tx),
      waitlist: (tx) => new WaitlistRepository(tx),
    },
    uow: {
      execute: async (work, msgId) => executeUoW(deps, db(), work, msgId),
    },
    services: {
      messageBus: once<IMessageBus>(() => new MessageBus(deps)),
      // Read-only service (verified 2026-06-11): three finders, no writes.
      // Destination: SQL query handler; repo finders here are transitional.
      connectionManager: once<IConnectionManager>(
        () =>
          new ConnectionManager(
            deps.repos.stripeConnections(transitionalRepoRead(deps.readDb())),
            deps.repos.slackConnections(transitionalRepoRead(deps.readDb())),
            deps.repos.notificationPreferences(transitionalRepoRead(deps.readDb())),
          ),
      ),
      // Read-only projection service. Same destination as above.
      productSetup: once<IProductSetupService>(
        () =>
          new ProductSetupService(
            deps.repos.products(transitionalRepoRead(deps.readDb())),
            deps.repos.stripeConnections(transitionalRepoRead(deps.readDb())),
            deps.repos.productAppDataSources(transitionalRepoRead(deps.readDb())),
            deps.repos.disputePlaybooks(transitionalRepoRead(deps.readDb())),
          ),
      ),
      queueClient: once<IQueueClient>(() => new QueueClient(env)),
      asyncGate: once<IAsyncGateClient>(() => new AsyncGateClient(env)),
      rateLimiter: once<IRateLimiterClient>(() => new RateLimiterClient(env)),
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
      notifications: (tx) => new NotificationService(deps, tx),
      slackOAuth: once<ISlackOAuthService>(() => new SlackOAuthService()),
      slackWebhook: once<ISlackWebhookNotifier>(() => new SlackWebhookNotifier()),
      // NOT read-only: refresh() writes rotated tokens through this repo outside any UoW,
      // and the once()-memoized provider is multi-writer (refresh-token rotation race).
      // Known violation — handoff doc §8 item 19.
      stripeClientProvider: once<IStripeClientProvider>(
        () =>
          new StripeClientProvider(
            deps.repos.stripeConnections(transitionalRepoRead(deps.readDb())),
          ),
      ),
      // Machinery exemption: the relay opens its own transaction on the writable root
      // handle (SELECT FOR UPDATE SKIP LOCKED → queue send → mark dispatched).
      outboxRelay: once<IOutboxRelay>(
        () => new OutboxRelay(db(), deps.services.queueClient(), (tx) => new OutboxRepository(tx)),
      ),
      analytics: once<IAnalyticsService>(() => new AnalyticsService(env, ctx)),
      jinaClient: once<IJinaClient>(() => new JinaClient({ apiKey: env.JINA_API_KEY })),
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
