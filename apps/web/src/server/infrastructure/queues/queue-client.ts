import type { DomainMessage } from '@riposte/core'
import { createLogger } from '@riposte/core'

export interface IQueueClient {
  send: (message: DomainMessage) => Promise<void>
  sendBatch: (messages: DomainMessage[]) => Promise<void>
}

const logger = createLogger('queue-client')

/**
 * QueueClient - Cloudflare Queue adapter
 *
 * Simple routing:
 * - Commands → CRITICAL_QUEUE (user-facing, needs fast processing)
 * - Events → BACKGROUND_QUEUE (async, can be delayed)
 */
export class QueueClient implements IQueueClient {
  constructor(private readonly env: Env) {}

  async send(message: DomainMessage): Promise<void> {
    const queue = this.getQueue(message.type)
    logger.debug('sending_message', { name: message.name, type: message.type })
    await queue.send(message)
  }

  async sendBatch(messages: DomainMessage[]): Promise<void> {
    const commands = messages.filter((m) => m.type === 'command')
    const events = messages.filter((m) => m.type === 'event')

    logger.debug('sending_batch', {
      commandCount: commands.length,
      eventCount: events.length,
      events: events.map((e) => e.name),
    })

    await Promise.all([
      commands.length > 0 && this.env.CRITICAL_QUEUE.sendBatch(commands.map((body) => ({ body }))),
      events.length > 0 && this.env.BACKGROUND_QUEUE.sendBatch(events.map((body) => ({ body }))),
    ])
  }

  private getQueue(type: DomainMessage['type']): Queue<DomainMessage> {
    return type === 'command' ? this.env.CRITICAL_QUEUE : this.env.BACKGROUND_QUEUE
  }
}
