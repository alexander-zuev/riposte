import type { DomainMessage } from '@riposte/core'
import { createLogger, queueMessageSchema, ValidationError } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { MessageBus } from '@server/application/message-bus/message-bus'
import type { IMessageBus } from '@server/application/message-bus/message-bus'
import { isPanic, isTaggedError, Result } from 'better-result'

const logger = createLogger('queue-consumer')

export class QueueConsumer {
  private static readonly MAX_ATTEMPTS = 5
  private static readonly BASE_RETRY_DELAY = 5
  private static readonly MAX_RETRY_DELAY = 120

  constructor(private readonly messageBus: IMessageBus) {}

  async processBatch(batch: MessageBatch): Promise<void> {
    logger.debug('batch_received', { count: batch.messages.length })
    await Promise.allSettled(batch.messages.map(async (message) => this.processMessage(message)))
  }

  private async processMessage(message: Message): Promise<void> {
    let parsedMsg: DomainMessage | undefined

    await Sentry.withIsolationScope(async (scope) => {
      try {
        const result = await Result.gen(async function* (this: QueueConsumer) {
          const msg = yield* Result.await(this.parseMessage(message.body))
          parsedMsg = msg
          if ('userId' in msg && msg.userId) scope.setUser({ id: msg.userId })

          yield* Result.await(this.messageBus.handle(msg))
          return Result.ok(msg)
        }, this)

        if (result.isErr()) {
          this.handleFailure(message, parsedMsg, result.error, {
            retryUnknown: isPanic(result.error),
          })
          return
        }

        message.ack()
        logger.info('processed', { name: result.value.name })
      } catch (error) {
        this.handleFailure(message, parsedMsg, error, { retryUnknown: true })
      }
    })
  }

  private async parseMessage(body: unknown): Promise<Result<DomainMessage, ValidationError>> {
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

  private handleFailure(
    message: Message,
    msg: DomainMessage | undefined,
    error: unknown,
    options?: { retryUnknown?: boolean },
  ): void {
    const panicRetryable = isPanic(error)
    const taggedRetryable = isTaggedError(error) && 'retryable' in error && error.retryable === true
    const unknownRetryable = options?.retryUnknown === true && !isTaggedError(error)
    const retryable = panicRetryable || taggedRetryable || unknownRetryable

    if (!retryable || message.attempts >= QueueConsumer.MAX_ATTEMPTS) {
      logger.error('dlq', {
        error,
        msg,
        attempt: message.attempts,
        retryable,
      })
      message.ack()
      return
    }

    const delay = Math.min(
      Math.floor(QueueConsumer.BASE_RETRY_DELAY * 1.5 ** (message.attempts - 1)),
      QueueConsumer.MAX_RETRY_DELAY,
    )
    logger.warn('retrying', {
      error,
      msg,
      attempt: message.attempts,
      delaySeconds: delay,
    })
    message.retry({ delaySeconds: delay })
  }
}

export async function queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
  const processor = new QueueConsumer(new MessageBus(env, ctx))
  await processor.processBatch(batch)
}
