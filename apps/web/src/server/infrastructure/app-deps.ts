import type { DatabaseError, DOUnreachableError, DuplicateMessageError } from '@riposte/core'
import type { IMessageBus } from '@server/application/message-bus/message-bus'
import { MessageBus } from '@server/application/message-bus/message-bus'
import { executeUoW } from '@server/application/message-bus/unit-of-work'
import type { IOutboxRepository, IWaitlistRepository } from '@server/domain/repository/interfaces'
import type { DrizzleDb } from '@server/infrastructure/db'
import { createDatabase } from '@server/infrastructure/db'
import type { IOutboxRelay } from '@server/infrastructure/queues/outbox-relay'
import { OutboxRelay } from '@server/infrastructure/queues/outbox-relay'
import {
  triggerOutboxRelay,
  wakeOutboxRelay,
} from '@server/infrastructure/queues/outbox-relay-wakeup'
import type { IQueueClient } from '@server/infrastructure/queues/queue-client'
import { QueueClient } from '@server/infrastructure/queues/queue-client'
import { OutboxRepository } from '@server/infrastructure/repositories/outbox.repository'
import { WaitlistRepository } from '@server/infrastructure/repositories/waitlist.repository'
import type { Result } from 'better-result'

type WaitUntilContext = Pick<ExecutionContext, 'waitUntil'>

export type AppDeps = {
  env: Env
  ctx: WaitUntilContext

  db: () => DrizzleDb

  repos: {
    outbox: (tx: DrizzleDb) => IOutboxRepository
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
    queueClient: () => IQueueClient
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
    repos: {
      outbox: (tx) => new OutboxRepository(tx),
      waitlist: (tx) => new WaitlistRepository(tx),
    },
    uow: {
      execute: (work, msgId) => executeUoW(deps, work, msgId),
    },
    services: {
      messageBus: once<IMessageBus>(() => new MessageBus(deps)),
      queueClient: once<IQueueClient>(() => new QueueClient(env)),
      outboxRelay: once<IOutboxRelay>(
        () => new OutboxRelay(deps.db(), deps.services.queueClient(), deps.repos.outbox),
      ),
    },
    hooks: {
      onEventsCommitted: () => {
        ctx.waitUntil(wakeOutboxRelay(env))
      },
      triggerOutboxRelay: () => triggerOutboxRelay(env),
    },
  }

  return deps
}

function once<T>(factory: () => T): () => T {
  let value: T | undefined
  return () => (value ??= factory())
}
