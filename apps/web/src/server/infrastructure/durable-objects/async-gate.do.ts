import { createLogger, createSentryOptions } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { DurableObject } from 'cloudflare:workers'

const logger = createLogger('async-gate-do')

export type AsyncGateWaitResult = 'resolved' | 'timeout'

class AsyncGateDOBase extends DurableObject<Env> {
  private pending: Array<{
    resolve: (result: AsyncGateWaitResult) => void
    timer: ReturnType<typeof setTimeout>
  }> = []

  async waitFor(timeoutMs: number): Promise<AsyncGateWaitResult> {
    const settled = (await this.ctx.storage.get<boolean>('settled')) === true
    if (settled) {
      await this.ctx.storage.delete('settled')
      return 'resolved'
    }

    return new Promise<AsyncGateWaitResult>((resolve) => {
      const waiter = {
        resolve,
        timer: setTimeout(() => {
          const index = this.pending.indexOf(waiter)
          if (index === -1) return
          logger.debug('wait_timeout')
          this.pending.splice(index, 1)
          resolve('timeout')
        }, timeoutMs),
      }
      this.pending.push(waiter)
    })
  }

  async resolve(): Promise<void> {
    await this.ctx.storage.put('settled', true)

    if (this.pending.length > 0) {
      const waiters = this.pending.splice(0)
      for (const waiter of waiters) {
        clearTimeout(waiter.timer)
        waiter.resolve('resolved')
      }
    }

    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.setAlarm(Date.now() + 5 * 60 * 1000)
  }

  async alarm(): Promise<void> {
    if (this.pending.length > 0) {
      const waiters = this.pending.splice(0)
      for (const waiter of waiters) {
        clearTimeout(waiter.timer)
        waiter.resolve('timeout')
      }
    }

    await this.ctx.storage.deleteAll()
  }
}

export type AsyncGateDO = InstanceType<typeof AsyncGateDOBase>
export const AsyncGateDO = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => createSentryOptions(env),
  AsyncGateDOBase,
)
