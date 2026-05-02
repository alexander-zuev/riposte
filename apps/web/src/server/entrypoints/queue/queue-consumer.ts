import type { DomainMessage } from '@riposte/core'
import { createLogger, queueMessageSchema } from '@riposte/core'
import { MessageBus } from '@server/application/message-bus/message-bus'
import type { IMessageBus } from '@server/application/message-bus/message-bus'
import * as Sentry from '@sentry/cloudflare'

const logger = createLogger('queue-consumer')

export class QueueConsumer {
  private static readonly MAX_ATTEMPTS = 5
  private static readonly BASE_RETRY_DELAY = 5
  private static readonly MAX_RETRY_DELAY = 120

  constructor(private readonly messageBus: IMessageBus) {}

  async processBatch(batch: MessageBatch): Promise<void> {
    logger.debug('batch_received', { count: batch.messages.length })
    await Promise.allSettled(batch.messages.map((message) => this.processMessage(message)))
  }

  private async processMessage(message: Message<unknown>): Promise<void> {
    const msg = await this.parseMessage(message.body)
    if (!msg) {
      message.ack()
      return
    }

    await Sentry.withIsolationScope(async (scope) => {
      if ('userId' in msg && msg.userId) scope.setUser({ id: msg.userId })

      try {
        await this.messageBus.handle(msg)
        message.ack()
        logger.info('processed', { name: msg.name })
      } catch (error) {
        this.handleError(message, msg, error)
      }
    })
  }

  private async parseMessage(body: unknown): Promise<DomainMessage | null> {
    const result = await queueMessageSchema.safeParseAsync(body)
    if (!result.success) {
      logger.error('Invalid message format', { error: result.error, body })
      return null
    }
    return result.data
  }

  private handleError(message: Message<unknown>, msg: DomainMessage, error: unknown): void {
    const retryable = error instanceof Error && 'retryable' in error && error.retryable === true

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
