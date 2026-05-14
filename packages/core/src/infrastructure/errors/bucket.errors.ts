import { TaggedError } from 'better-result'

export type R2ErrorReason =
  | 'internal_error'
  | 'unauthorized'
  | 'access_denied'
  | 'expired_request'
  | 'signature_mismatch'
  | 'not_entitled'
  | 'invalid_bucket_name'
  | 'bucket_not_found'
  | 'bucket_not_empty'
  | 'too_many_buckets'
  | 'bucket_conflict'
  | 'object_not_found'
  | 'invalid_object_name'
  | 'object_too_large'
  | 'metadata_too_large'
  | 'object_locked'
  | 'missing_content_length'
  | 'incomplete_body'
  | 'invalid_digest'
  | 'bad_digest'
  | 'invalid_range'
  | 'precondition_failed'
  | 'multipart_part_too_small'
  | 'multipart_upload_not_found'
  | 'invalid_multipart_part'
  | 'invalid_multipart_part_size'
  | 'service_unavailable'
  | 'client_disconnect'
  | 'too_many_requests'
  | 'unknown'

export interface R2ErrorMeta {
  code: number
  action: string
  name?: string
  reason: R2ErrorReason
}

const R2_ERROR_CODE_DETAILS = new Map<number, { reason: R2ErrorReason; retryable: boolean }>([
  [10002, { reason: 'unauthorized', retryable: false }],
  [10003, { reason: 'access_denied', retryable: false }],
  [10018, { reason: 'expired_request', retryable: false }],
  [10035, { reason: 'signature_mismatch', retryable: false }],
  [10042, { reason: 'not_entitled', retryable: false }],
  [10005, { reason: 'invalid_bucket_name', retryable: false }],
  [10006, { reason: 'bucket_not_found', retryable: false }],
  [10008, { reason: 'bucket_not_empty', retryable: false }],
  [10009, { reason: 'too_many_buckets', retryable: false }],
  [10073, { reason: 'bucket_conflict', retryable: false }],
  [10007, { reason: 'object_not_found', retryable: false }],
  [10020, { reason: 'invalid_object_name', retryable: false }],
  [100100, { reason: 'object_too_large', retryable: false }],
  [10012, { reason: 'metadata_too_large', retryable: false }],
  [10069, { reason: 'object_locked', retryable: false }],
  [10033, { reason: 'missing_content_length', retryable: false }],
  [10013, { reason: 'incomplete_body', retryable: true }],
  [10014, { reason: 'invalid_digest', retryable: false }],
  [10037, { reason: 'bad_digest', retryable: true }],
  [10039, { reason: 'invalid_range', retryable: false }],
  [10031, { reason: 'precondition_failed', retryable: false }],
  [10011, { reason: 'multipart_part_too_small', retryable: false }],
  [10024, { reason: 'multipart_upload_not_found', retryable: false }],
  [10025, { reason: 'invalid_multipart_part', retryable: false }],
  [10048, { reason: 'invalid_multipart_part_size', retryable: false }],
  [10001, { reason: 'internal_error', retryable: true }],
  [10043, { reason: 'service_unavailable', retryable: true }],
  [10054, { reason: 'client_disconnect', retryable: true }],
  [10058, { reason: 'too_many_requests', retryable: true }],
])

type R2ErrorLike = Error & {
  code: number
  action: string
}

function findR2Error(cause: unknown): R2ErrorLike | undefined {
  if (isR2ErrorLike(cause)) return cause
  if (cause instanceof Error && isR2ErrorLike(cause.cause)) return cause.cause
  return undefined
}

function isR2ErrorLike(value: unknown): value is R2ErrorLike {
  return (
    value instanceof Error &&
    'code' in value &&
    typeof value.code === 'number' &&
    'action' in value &&
    typeof value.action === 'string'
  )
}

function extractR2Meta(cause: unknown): R2ErrorMeta | undefined {
  const r2 = findR2Error(cause)
  const code = r2?.code ?? extractR2CodeFromMessage(cause)
  if (!code) return undefined

  return {
    code,
    action: r2?.action ?? 'unknown',
    name: r2?.name,
    reason: R2_ERROR_CODE_DETAILS.get(code)?.reason ?? 'unknown',
  }
}

function extractR2CodeFromMessage(cause: unknown): number | undefined {
  if (!(cause instanceof Error)) return undefined

  const match = cause.message.match(/\((\d+)\)\s*$/)
  if (!match?.[1]) return undefined

  const code = Number(match[1])
  return Number.isInteger(code) ? code : undefined
}

export class BlobStorageError extends TaggedError('BlobStorageError')<{
  message: string
  cause: unknown
  retryable: boolean
  r2?: R2ErrorMeta
}>() {
  constructor(args: { message: string; cause: unknown }) {
    const r2 = extractR2Meta(args.cause)
    const retryable = r2 ? (R2_ERROR_CODE_DETAILS.get(r2.code)?.retryable ?? true) : true

    super({ message: args.message, cause: args.cause, retryable, r2 })
  }
}
