import type { ListDisputeCaseMessagesResult, RpcResult } from '@riposte/core/client'

type MockState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: ListDisputeCaseMessagesResult }

let state: MockState = { status: 'success', data: { items: [] } }

export function setDisputeCaseMessagesMockState(next: MockState) {
  state = next
}

export async function listDisputeCaseMessages(): Promise<
  RpcResult<ListDisputeCaseMessagesResult, never>
> {
  if (state.status === 'loading') {
    return new Promise(() => {})
  }

  if (state.status === 'error') {
    throw new Error(state.message)
  }

  return {
    status: 'ok',
    value: state.data,
  }
}
