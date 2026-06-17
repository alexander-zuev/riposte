import type { QueueMessage } from '@riposte/core'
import {
  createLogger,
  DuplicateMessageError,
  queueMessageSchema,
  ValidationError,
} from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import type { IMessageBus } from '@server/application/message-bus/message-bus'
import { runWithAnalyticsContext } from '@server/infrastructure/analytics/analytics-context'
import type { AppDeps } from '@server/infrastructure/app-deps'
import type { IQueueClient } from '@server/infrastructure/queues/queue-client'
import { isPanic, isTaggedError, Result } from 'better-result'

const logger = createLogger('queue-consumer')

/**
 * QueueConsumer — parse a message, dispatch it to the bus, decide ack vs retry.
 *
 * The platform owns the retry ceiling and dead-lettering: `max_retries` +
 * `dead_letter_queue` in `wrangler.jsonc` count attempts and route an exhausted message
 * to the DLQ with no consumer code. This consumer never counts attempts; it owns only the
 * per-message decision (retry vs discard) and the backoff curve. The single DLQ write it
 * makes is for a poison message — an unparseable body that will never succeed on retry,
 * parked for inspection instead of silently dropped.
 */
export class QueueConsumer {
  private static readonly BASE_RETRY_DELAY = 5 // seconds
  private static readonly MAX_RETRY_DELAY = 120 // 2 minutes

  constructor(
    private readonly messageBus: IMessageBus,
    private readonly queueClient: IQueueClient,
  ) {}

  async processBatch(batch: MessageBatch): Promise<void> {
    logger.debug('batch_received', { count: batch.messages.length })
    // Messages are independent; settle all so one stray rejection can't drop its siblings.
    await Promise.allSettled(batch.messages.map(async (message) => this.processMessage(message)))
  }

  private async processMessage(message: Message): Promise<void> {
    const parsed = await this.parseMessage(message.body)
    if (parsed.isErr()) {
      // Poison: an unparseable body never succeeds on retry. Park it in the DLQ for
      // inspection (which producer sent garbage?) instead of silently acking it away.
      logger.error('invalid_message_format', { attempt: message.attempts, body: message.body })
      await this.parkPoison(message)
      return
    }
    const msg = parsed.value

    await Sentry.withIsolationScope(async (scope) => {
      try {
        if ('userId' in msg && msg.userId) scope.setUser({ id: msg.userId })

        // Ambient dedup identity for any analytics fired by this message's subscribers; the
        // envelope id (+ event timestamp when present) is replayed unchanged on redelivery.
        const result = await runWithAnalyticsContext(
          {
            idempotencyKey: {
              uuid: msg.id,
              ...('timestamp' in msg && msg.timestamp ? { timestamp: msg.timestamp } : {}),
            },
          },
          async () => this.messageBus.handle(msg),
        )

        if (result.isErr()) {
          // Already-processed redelivery: the claim rejected it. Ack as a skip, like the
          // event path that maps this error to Result.ok in the bus.
          if (DuplicateMessageError.is(result.error)) {
            logger.warn('duplicate_skipped', {
              name: msg.name,
              messageId: msg.id,
              attempt: message.attempts,
            })
            message.ack()
            return
          }
          this.handleFailure(message, msg, result.error)
          return
        }

        message.ack()
        logger.info('processed', { name: msg.name })
      } catch (error) {
        this.handleFailure(message, msg, error)
      }
    })
  }

  /**
   * Park an unparseable message in the DLQ, then ack. If the DLQ write fails, retry so a
   * later delivery can re-attempt parking; the platform's max_retries + DLQ is the backstop.
   */
  private async parkPoison(message: Message): Promise<void> {
    const sent = await this.queueClient.sendToDlq(message.body)
    sent.match({
      ok: () => message.ack(),
      err: (error) => {
        logger.error('dlq_send_failed', { attempt: message.attempts, error })
        message.retry()
      },
    })
  }

  private async parseMessage(body: unknown): Promise<Result<QueueMessage, ValidationError>> {
    const parsed = await queueMessageSchema.safeParseAsync(body)
    if (!parsed.success) {
      return Result.err(
        new ValidationError({
          issues: parsed.error.issues.map((i) => ({
            code: i.code,
            path: i.path.map((p) => (typeof p === 'symbol' ? String(p) : p)),
            message: i.message,
          })),
          message: 'Invalid queue message format',
        }),
      )
    }

    return Result.ok(parsed.data)
  }

  /**
   * Decide retry vs discard for a failed dispatch. The platform owns the attempt ceiling
   * and dead-lettering, so this never counts attempts: retryable → backoff retry;
   * non-retryable → discard (acked, logged for Sentry).
   */
  private handleFailure(message: Message, msg: QueueMessage | undefined, error: unknown): void {
    if (!isRetryable(error)) {
      logger.error('message_discarded', { error, msg, attempt: message.attempts })
      message.ack()
      return
    }

    const delay = this.calculateRetryDelay(message.attempts)
    logger.warn('retrying', { error, msg, attempt: message.attempts, delaySeconds: delay })
    message.retry({ delaySeconds: delay })
  }

  /**
   * Exponential backoff for the retryable path. Bounds the delay the platform applies
   * between re-deliveries; the platform still owns how many re-deliveries happen.
   */
  private calculateRetryDelay(attempts: number): number {
    return Math.min(
      Math.floor(QueueConsumer.BASE_RETRY_DELAY * 1.5 ** (attempts - 1)),
      QueueConsumer.MAX_RETRY_DELAY,
    )
  }
}

/**
 * Tagged errors declare their own retry policy; panics and raw throws retry by default —
 * give a transient bug a chance, and let the platform's `max_retries` dead-letter it if it
 * persists. Panic is checked first because it carries a `_tag` (so it reads as a tagged
 * error) but has no `retryable` field. A tagged error with no `retryable` field is treated
 * as non-retryable.
 */
function isRetryable(error: unknown): boolean {
  if (isPanic(error)) return true
  if (isTaggedError(error)) return 'retryable' in error && error.retryable === true
  return true
}

export async function queue(batch: MessageBatch, deps: AppDeps): Promise<void> {
  const consumer = new QueueConsumer(deps.services.messageBus(), deps.services.queueClient())
  await consumer.processBatch(batch)
}
