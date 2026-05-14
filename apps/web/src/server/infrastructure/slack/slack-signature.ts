import { SlackWebhookError } from '@riposte/core'
import { Result } from 'better-result'

const MAX_TIMESTAMP_AGE_SECONDS = 60 * 5

export async function verifySlackRequestSignature(input: {
  body: string
  timestamp: string | null
  signature: string | null
  signingSecret: string
  now?: Date
}): Promise<Result<void, SlackWebhookError>> {
  if (!input.timestamp || !input.signature) {
    return Result.err(
      new SlackWebhookError({
        operation: 'signature_verification',
        message: 'Missing Slack signature headers',
        retryable: false,
      }),
    )
  }

  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000)
  const timestampSeconds = Number(input.timestamp)
  if (!Number.isFinite(timestampSeconds)) {
    return Result.err(
      new SlackWebhookError({
        operation: 'signature_verification',
        message: 'Invalid Slack signature timestamp',
        retryable: false,
      }),
    )
  }

  if (Math.abs(nowSeconds - timestampSeconds) > MAX_TIMESTAMP_AGE_SECONDS) {
    return Result.err(
      new SlackWebhookError({
        operation: 'signature_verification',
        message: 'Stale Slack signature timestamp',
        retryable: false,
      }),
    )
  }

  const expected = await signSlackBody({
    body: input.body,
    timestamp: input.timestamp,
    signingSecret: input.signingSecret,
  })

  if (!timingSafeEqual(expected, input.signature)) {
    return Result.err(
      new SlackWebhookError({
        operation: 'signature_verification',
        message: 'Invalid Slack request signature',
        retryable: false,
      }),
    )
  }

  return Result.ok(undefined)
}

export async function signSlackBody(input: {
  body: string
  timestamp: string
  signingSecret: string
}): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(input.signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const data = new TextEncoder().encode(`v0:${input.timestamp}:${input.body}`)
  const signature = await crypto.subtle.sign('HMAC', key, data)

  return `v0=${bytesToHex(new Uint8Array(signature))}`
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left)
  const rightBytes = new TextEncoder().encode(right)
  if (leftBytes.length !== rightBytes.length) return false

  let diff = 0
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index]! ^ rightBytes[index]!
  }
  return diff === 0
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
