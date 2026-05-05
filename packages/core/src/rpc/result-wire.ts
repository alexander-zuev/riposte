import {
  Result,
  ResultDeserializationError,
  type Result as BetterResult,
  type SerializedResult,
} from 'better-result'

// Strips methods and maps `unknown` to JsonValue so TanStack Start's ValidateSerializableMapped accepts the type.
type Serializable<T> = T extends (...args: unknown[]) => unknown
  ? never
  : T extends object
    ? {
        [K in keyof T as T[K] extends (...args: unknown[]) => unknown ? never : K]: Serializable<
          T[K]
        >
      }
    : unknown extends T
      ? JsonValue
      : T

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type RpcResult<T, E> =
  | { status: 'ok'; value: T }
  | { status: 'error'; error: Serializable<E> }

// For DO, queue, workflow — no seroval, no type stripping needed.
export function toRpc<T, E>(result: BetterResult<T, E>): SerializedResult<T, E> {
  return Result.serialize(result)
}

// For TanStack Start server fns. Spread breaks Error prototype chain so seroval's
// ShallowErrorPlugin doesn't intercept and strip custom fields (see TanStack/router#7339).
export function toServerFnRpc<T, E>(result: BetterResult<T, E>): RpcResult<T, E> {
  const serialized = Result.serialize(result)
  if (
    serialized.status === 'error' &&
    typeof serialized.error === 'object' &&
    serialized.error !== null
  ) {
    const plain = JSON.parse(JSON.stringify(serialized.error)) as Record<string, unknown>
    delete plain.stack

    return { status: 'error', error: plain } as RpcResult<T, E>
  }
  return serialized as RpcResult<T, E>
}

// Client-side: reconstruct Result from wire data. T and E inferred from input.
export function fromRpc<T, E>(
  data: RpcResult<T, E> | SerializedResult<T, E>,
): BetterResult<T, E | ResultDeserializationError> {
  return Result.deserialize<T, E>(data)
}
