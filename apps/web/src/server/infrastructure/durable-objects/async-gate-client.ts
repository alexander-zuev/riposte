import { createLogger, type DOUnreachableError } from '@riposte/core'
import type { Result } from 'better-result'

import type { AsyncGateDO, AsyncGateWaitResult } from './async-gate.do'
import { DurableObjectRpc, type IDurableObjectRpc } from './durable-object-rpc'

const logger = createLogger('async-gate-client')

export interface IAsyncGateClient {
  waitFor: (
    key: string,
    timeoutMs: number,
  ) => Promise<Result<AsyncGateWaitResult, DOUnreachableError>>
  resolve: (key: string) => Promise<Result<void, DOUnreachableError>>
  tryResolve: (key: string) => Promise<void>
}

export class AsyncGateClient implements IAsyncGateClient {
  constructor(
    private readonly env: Env,
    private readonly rpc: IDurableObjectRpc = new DurableObjectRpc(),
  ) {}

  async waitFor(
    key: string,
    timeoutMs: number,
  ): Promise<Result<AsyncGateWaitResult, DOUnreachableError>> {
    return this.rpc.call(async () => this.stub(key).waitFor(timeoutMs))
  }

  async resolve(key: string): Promise<Result<void, DOUnreachableError>> {
    return this.rpc.call(async () => this.stub(key).resolve())
  }

  async tryResolve(key: string): Promise<void> {
    const result = await this.resolve(key)
    if (result.isErr()) {
      logger.warn('async_gate_resolve_failed', { key, error: result.error })
    }
  }

  private stub(key: string): DurableObjectStub<AsyncGateDO> {
    return this.env.ASYNC_GATE.get(this.env.ASYNC_GATE.idFromName(key))
  }
}

export function disputeSyncGateKey(syncRequestId: string): string {
  return `dispute-sync:${syncRequestId}`
}
