import type {
  GetDisputeCaseActivityResult,
  ListDisputeCaseActivityResult,
  RpcResult,
} from '@riposte/core/client'

type MockState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: ListDisputeCaseActivityResult }

let state: MockState = { status: 'success', data: { cases: [] } }

export function setDisputeCaseActivityMockState(next: MockState) {
  state = next
}

export async function listDisputeCaseActivity(): Promise<
  RpcResult<ListDisputeCaseActivityResult, never>
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

export async function getDisputeCaseActivity(): Promise<
  RpcResult<GetDisputeCaseActivityResult, never>
> {
  if (state.status === 'loading') {
    return new Promise(() => {})
  }

  if (state.status === 'error') {
    throw new Error(state.message)
  }

  return {
    status: 'ok',
    value: { activity: state.data.cases[0] ?? null },
  }
}
