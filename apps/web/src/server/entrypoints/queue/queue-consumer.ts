import { createLogger } from '@riposte/core/client'
import * as Sentry from '@sentry/cloudflare'

const logger = createLogger('queue-consumer')

class QueueConsumer {
  private static readonly MAX_ATTEMPTS = 5
  private static readonly BASE_RETRY_DELAY = 5
  private static readonly MAX_RETRY_DELAY = 120

  constructor(private readonly env: Env) {}

  async processBatch(batch: MessageBatch): Promise<void> {
    logger.debug('batch_received', { count: batch.messages.length })
    for (const message of batch.messages) {
      await this.processMessage(message)
    }
  }

  private async processMessage(message: Message<unknown>): Promise<void> {
    const body =
      typeof message.body === 'object' && message.body !== null
        ? (message.body as Record<string, unknown>)
        : null

    if (!body || typeof body.name !== 'string') {
      logger.error('invalid_message', {
        error: new Error('Missing or invalid message body'),
        body: message.body,
      })
      message.ack()
      return
    }

    const name = body.name
    const userId = typeof body.userId === 'string' ? body.userId : undefined

    await Sentry.withIsolationScope(async (scope) => {
      if (userId) scope.setUser({ id: userId })

      try {
        // TODO: wire to MessageBus once handlers exist
        logger.warn('unhandled_message', { name })
        message.ack()
      } catch (error) {
        this.handleError(message, name, userId, error)
      }
    })
  }

  private handleError(
    message: Message<unknown>,
    name: string,
    userId: string | undefined,
    error: unknown,
  ): void {
    const retryable = error instanceof Error && 'retryable' in error && error.retryable === true

    if (!retryable || message.attempts >= QueueConsumer.MAX_ATTEMPTS) {
      logger.error('dlq', { name, attempt: message.attempts, retryable, userId, error })
      message.ack()
      return
    }

    const delay = Math.min(
      Math.floor(QueueConsumer.BASE_RETRY_DELAY * 1.5 ** (message.attempts - 1)),
      QueueConsumer.MAX_RETRY_DELAY,
    )
    logger.warn('retrying', { name, attempt: message.attempts, delaySeconds: delay, error })
    message.retry({ delaySeconds: delay })
  }
}

export async function queue(batch: MessageBatch, env: Env, _ctx: ExecutionContext): Promise<void> {
  const processor = new QueueConsumer(env)
  await processor.processBatch(batch)
}
