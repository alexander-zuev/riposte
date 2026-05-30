import { createLogger, createSentryOptions } from '@riposte/core'
import * as Sentry from '@sentry/cloudflare'
import { DurableObject } from 'cloudflare:workers'

const logger = createLogger('async-gate-do')

export type AsyncGateWaitResult = 'resolved' | 'timeout'

class AsyncGateDOBase extends DurableObject<Env> {
  private pending: {
    resolve: (result: AsyncGateWaitResult) => void
    timer: ReturnType<typeof setTimeout>
  } | null = null

  async waitFor(timeoutMs: number): Promise<AsyncGateWaitResult> {
    const settled = (await this.ctx.storage.get<boolean>('settled')) === true
    if (settled) {
      await this.ctx.storage.delete('settled')
      return 'resolved'
    }

    return new Promise<AsyncGateWaitResult>((resolve) => {
      this.pending = {
        resolve,
        timer: setTimeout(() => {
          if (!this.pending) return
          logger.debug('wait_timeout')
          this.pending = null
          resolve('timeout')
        }, timeoutMs),
      }
    })
  }

  async resolve(): Promise<void> {
    await this.ctx.storage.put('settled', true)

    if (this.pending) {
      clearTimeout(this.pending.timer)
      this.pending.resolve('resolved')
      this.pending = null
    }

    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.setAlarm(Date.now() + 5 * 60 * 1000)
  }

  async alarm(): Promise<void> {
    if (this.pending) {
      clearTimeout(this.pending.timer)
      this.pending.resolve('timeout')
      this.pending = null
    }

    await this.ctx.storage.deleteAll()
  }
}

export type AsyncGateDO = InstanceType<typeof AsyncGateDOBase>
export const AsyncGateDO = Sentry.instrumentDurableObjectWithSentry(
  (env: Env) => createSentryOptions(env),
  AsyncGateDOBase,
)
