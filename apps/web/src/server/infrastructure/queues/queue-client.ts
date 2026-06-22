import type { DomainMessage } from '@riposte/core'
import { createLogger } from '@riposte/core'
import { OversizedMessageError, QueueError } from '@riposte/core'
import { isTransientError, RETRY } from '@server/infrastructure/resilience/retry'
import { Result } from 'better-result'

export interface IQueueClient {
  send: (message: DomainMessage) => Promise<Result<void, QueueError | OversizedMessageError>>
  /** Sends every sendable message (chunked); `Ok` returns the refused ones, which are oversized (the only refusal reason). */
  sendBatch: (messages: DomainMessage[]) => Promise<Result<DomainMessage[], QueueError>>
  sendToDlq: (body: unknown) => Promise<Result<void, QueueError>>
}

const logger = createLogger('queue-client')

/**
 * Cloudflare Queues producer limits (serialized message body):
 *   128 KB per message · 256 KB per sendBatch · 100 messages per sendBatch.
 * (https://developers.cloudflare.com/queues/platform/limits/ — message size
 * includes ~100 bytes internal metadata.)
 *
 * We measure size PRE-FLIGHT and stay under each limit with headroom; we never
 * parse the platform error (a plain `Error` with no `code`, wording differs
 * between send/sendBatch — see the drift sentinel at
 * test/integration/queue-size-limits.integration.test.ts). An oversized message
 * can never be sent on ANY queue (the DLQ shares the cap), so it is refused here
 * and dead-lettered by the relay, which keeps the full payload on the outbox row.
 */
const MAX_MESSAGE_BYTES = 127_000
const MAX_BATCH_BYTES = 250_000
const MAX_BATCH_COUNT = 100

function byteLen(message: DomainMessage): number {
  return new TextEncoder().encode(JSON.stringify(message)).length
}

type Sized = { message: DomainMessage; bytes: number }

/** Split into batches that stay under BOTH the 100-message and 256 KB sendBatch caps. */
function chunkByLimits(sized: Sized[]): DomainMessage[][] {
  const chunks: DomainMessage[][] = []
  let current: DomainMessage[] = []
  let bytes = 0
  for (const { message, bytes: b } of sized) {
    if (current.length > 0 && (current.length >= MAX_BATCH_COUNT || bytes + b > MAX_BATCH_BYTES)) {
      chunks.push(current)
      current = []
      bytes = 0
    }
    current.push(message)
    bytes += b
  }
  if (current.length > 0) chunks.push(current)
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

  async send(message: DomainMessage): Promise<Result<void, QueueError | OversizedMessageError>> {
    const bytes = byteLen(message)
    if (bytes > MAX_MESSAGE_BYTES) {
      logger.warn('queue_message_oversized', { name: message.name, type: message.type, bytes })
      return Result.err(
        new OversizedMessageError({ messageName: message.name, bytes, limit: MAX_MESSAGE_BYTES }),
      )
    }

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

  async sendBatch(messages: DomainMessage[]): Promise<Result<DomainMessage[], QueueError>> {
    const sized = messages.map((message) => ({ message, bytes: byteLen(message) }))
    const rejected = sized.filter((s) => s.bytes > MAX_MESSAGE_BYTES)
    const sendable = sized.filter((s) => s.bytes <= MAX_MESSAGE_BYTES)

    for (const { message, bytes } of rejected) {
      logger.warn('queue_message_oversized', { name: message.name, type: message.type, bytes })
    }

    const commands = sendable.filter((s) => s.message.type === 'command')
    const events = sendable.filter((s) => s.message.type === 'event')

    logger.debug('sending_batch', {
      commandCount: commands.length,
      eventCount: events.length,
      rejected: rejected.length,
    })

    const result = await Result.tryPromise(
      {
        try: async () => {
          const sends: Promise<unknown>[] = []

          // Chunk to the platform's per-batch count and byte caps so large producers
          // (e.g. a time-based dispute scan fanning out commands) can't overflow a
          // single sendBatch.
          for (const group of chunkByLimits(commands)) {
            sends.push(this.env.CRITICAL_QUEUE.sendBatch(group.map((body) => ({ body }))))
          }

          for (const group of chunkByLimits(events)) {
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
      },
      RETRY.transient,
    )

    if (result.isErr()) return Result.err(result.error)
    return Result.ok(rejected.map((s) => s.message))
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
