import { Result, type Result as BetterResult } from 'better-result'

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type RpcWireResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'error'; error: JsonValue }

export function serializeForRpc<T, E>(result: BetterResult<T, E>): RpcWireResult<T> {
  return Result.serialize(result) as RpcWireResult<T>
}
