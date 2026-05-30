import type { ListDisputeCasesResult, RpcResult } from '@riposte/core/client'

export async function listDisputeCases(): Promise<RpcResult<ListDisputeCasesResult, never>> {
  return {
    status: 'ok',
    value: {
      items: [],
      nextCursor: null,
    },
  }
}

export async function countActionableDisputeCases(): Promise<RpcResult<{ count: number }, never>> {
  return {
    status: 'ok',
    value: { count: 0 },
  }
}

export async function syncDisputesForProduct(): Promise<
  RpcResult<{ status: 'completed' | 'pending' }, never>
> {
  return {
    status: 'ok',
    value: { status: 'completed' },
  }
}
