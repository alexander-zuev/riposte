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
  IDisputeCaseRepository,
  IDisputeEvidenceArtifactBlobRepository,
  IDisputeEvidencePacketRepository,
  IDisputePlaybookRepository,
  INotificationPreferenceRepository,
  IOutboxRepository,
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
import type { DrizzleDb } from '@server/infrastructure/db'
import { createDatabase } from '@server/infrastructure/db'
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
import { DisputeCaseRepository } from '@server/infrastructure/repositories/dispute-case.repository'
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

  kv: {
    auth: KVClient
    cache: KVClient
  }

  repos: {
    disputeCases: (tx: DrizzleDb) => IDisputeCaseRepository
    disputeEvidenceArtifactBlobs: () => IDisputeEvidenceArtifactBlobRepository
    disputeEvidencePackets: (tx: DrizzleDb) => IDisputeEvidencePacketRepository
    disputePlaybooks: (tx: DrizzleDb) => IDisputePlaybookRepository
    notificationPreferences: (tx: DrizzleDb) => INotificationPreferenceRepository
    outbox: (tx: DrizzleDb) => IOutboxRepository
    productAppDataSources: (tx: DrizzleDb) => IProductAppDataSourceRepository
    products: (tx: DrizzleDb) => IProductRepository
    slackConnections: (tx: DrizzleDb) => ISlackConnectionRepository
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
    productSetup: () => IProductSetupService
    queueClient: () => IQueueClient
    credentialEncryption: () => ICredentialEncryptionService
    disputeAgentClient: () => IDisputeAgentClient
    email: () => IEmailService
    notifications: (tx: DrizzleDb) => INotificationService
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
      execute: async (work, msgId) => executeUoW(deps, work, msgId),
    },
    services: {
      messageBus: once<IMessageBus>(() => new MessageBus(deps)),
      connectionManager: once<IConnectionManager>(
        () =>
          new ConnectionManager(
            deps.repos.stripeConnections(deps.db()),
            deps.repos.slackConnections(deps.db()),
            deps.repos.notificationPreferences(deps.db()),
          ),
      ),
      productSetup: once<IProductSetupService>(
        () =>
          new ProductSetupService(
            deps.repos.products(deps.db()),
            deps.repos.stripeConnections(deps.db()),
            deps.repos.productAppDataSources(deps.db()),
            deps.repos.disputePlaybooks(deps.db()),
          ),
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
      notifications: (tx) => new NotificationService(deps, tx),
      slackOAuth: once<ISlackOAuthService>(() => new SlackOAuthService()),
      slackWebhook: once<ISlackWebhookNotifier>(() => new SlackWebhookNotifier()),
      stripeClientProvider: once<IStripeClientProvider>(
        () => new StripeClientProvider(deps.repos.stripeConnections(deps.db())),
      ),
      outboxRelay: once<IOutboxRelay>(
        () => new OutboxRelay(deps.db(), deps.services.queueClient(), deps.repos.outbox),
      ),
      analytics: once<IAnalyticsService>(() => new AnalyticsService(env)),
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
