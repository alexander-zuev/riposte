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
