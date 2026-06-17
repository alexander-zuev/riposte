import type { DomainMessage } from '@riposte/core'
import { createLogger } from '@riposte/core'
import { QueueError } from '@riposte/core'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import { Result } from 'better-result'

export interface IQueueClient {
  send: (message: DomainMessage) => Promise<Result<void, QueueError>>
  sendBatch: (messages: DomainMessage[]) => Promise<Result<void, QueueError>>
  sendToDlq: (body: unknown) => Promise<Result<void, QueueError>>
}

const logger = createLogger('queue-client')

/** Cloudflare Queues caps a single sendBatch at 100 messages. */
const MAX_BATCH_SIZE = 100

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

/**
 * QueueClient - Cloudflare Queue adapter
 *
 * Simple routing:
 * - Commands → CRITICAL_QUEUE (user-facing, needs fast processing)
 * - Events → BACKGROUND_QUEUE (async, can be delayed)
 */
export class QueueClient implements IQueueClient {
  constructor(private readonly env: Env) {}

  async send(message: DomainMessage): Promise<Result<void, QueueError>> {
    const queue = this.getQueue(message.type)
    logger.debug('sending_message', { name: message.name, type: message.type })
    return Result.tryPromise(
      {
        try: async () => {
          await queue.send(message)
        },
        catch: (cause) =>
          new QueueError({
            message: 'Failed to send queue message',
            cause,
            retryable: isTransientError(cause),
          }),
      },
      RETRY.transient,
    )
  }

  async sendBatch(messages: DomainMessage[]): Promise<Result<void, QueueError>> {
    const commands = messages.filter((m) => m.type === 'command')
    const events = messages.filter((m) => m.type === 'event')

    logger.debug('sending_batch', {
      commandCount: commands.length,
      eventCount: events.length,
      events: events.map((e) => e.name),
    })

    return Result.tryPromise({
      try: async () => {
        const sends: Promise<unknown>[] = []

        // Chunk to the platform's 100-message batch cap so large producers (e.g. a
        // time-based dispute scan fanning out commands) don't overflow a single sendBatch.
        for (const group of chunk(commands, MAX_BATCH_SIZE)) {
          sends.push(this.env.CRITICAL_QUEUE.sendBatch(group.map((body) => ({ body }))))
        }

        for (const group of chunk(events, MAX_BATCH_SIZE)) {
          sends.push(this.env.BACKGROUND_QUEUE.sendBatch(group.map((body) => ({ body }))))
        }

        await Promise.all(sends)
      },
      catch: (cause) =>
        new QueueError({
          message: 'Failed to send queue batch',
          cause,
          retryable: isTransientError(cause),
        }),
    })
  }

  async sendToDlq(body: unknown): Promise<Result<void, QueueError>> {
    logger.debug('sending_to_dlq')
    return Result.tryPromise(
      {
        try: async () => {
          await this.env.DLQ.send(body)
        },
        catch: (cause) =>
          new QueueError({
            message: 'Failed to send DLQ message',
            cause,
            retryable: isTransientError(cause),
          }),
      },
      RETRY.transient,
    )
  }

  private getQueue(type: DomainMessage['type']): Queue<DomainMessage> {
    return type === 'command' ? this.env.CRITICAL_QUEUE : this.env.BACKGROUND_QUEUE
  }
}
