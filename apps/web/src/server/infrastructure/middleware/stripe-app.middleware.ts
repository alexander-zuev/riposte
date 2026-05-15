import {
  AuthenticationError,
  InternalServerError,
  ValidationError,
  createLogger,
  type ValidationIssue,
} from '@riposte/core'
import { getServerConfig } from '@server/infrastructure/config'
import { resultToApiResponse } from '@server/infrastructure/http/api-result'
import { createMiddleware } from '@tanstack/react-start'
import { setResponseHeaders } from '@tanstack/react-start/server'
import { Result } from 'better-result'
import StripeClient from 'stripe'
import { z } from 'zod'

const logger = createLogger('stripe-app-middleware')

const STRIPE_APP_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
  Vary: 'Origin',
} as const

const signedStripeAppBodySchema = z.object({
  user_id: z.string().min(1),
  account_id: z.string().min(1),
  livemode: z.boolean(),
})

type StripeAppVerifiedRequest = {
  accountId: string
  livemode: boolean
  userId: string
}

type StripeAppVerificationError = AuthenticationError | InternalServerError | ValidationError

export const stripeAppCorsMiddleware = createMiddleware({ type: 'request' }).server(
  async ({ next, request }) => {
    setResponseHeaders(new Headers(STRIPE_APP_CORS_HEADERS))

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: STRIPE_APP_CORS_HEADERS,
      })
    }

    return next()
  },
)

export const requireStripeAppSignature = createMiddleware({ type: 'request' }).server(
  async ({ next, request }) => {
    const verified = await verifyStripeAppRequest(
      request,
      getServerConfig().stripe.appSigningSecret,
    )
    if (verified.isErr()) {
      const response = resultToApiResponse(verified)
      for (const [key, value] of Object.entries(STRIPE_APP_CORS_HEADERS)) {
        response.headers.set(key, value)
      }
      return response
    }

    return next({
      context: {
        stripeApp: {
          userId: verified.value.userId,
          accountId: verified.value.accountId,
          livemode: verified.value.livemode,
        },
      },
    })
  },
)

export async function verifyStripeAppRequest(
  request: Request,
  appSigningSecret?: string,
): Promise<Result<StripeAppVerifiedRequest, StripeAppVerificationError>> {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    logger.warn('stripe_app_signature_missing')
    return Result.err(new AuthenticationError({ message: 'Missing Stripe App signature' }))
  }

  let body: unknown
  try {
    body = JSON.parse(await request.clone().text())
  } catch {
    body = undefined
  }

  const parsed = signedStripeAppBodySchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue): ValidationIssue => ({
        code: issue.code,
        path: issue.path.filter((part): part is string | number => typeof part !== 'symbol'),
        message: issue.message,
      }),
    )
    logger.warn('stripe_app_signature_payload_invalid', { issues })
    return Result.err(
      new ValidationError({
        message: 'Invalid Stripe App signed payload',
        issues,
      }),
    )
  }

  if (!appSigningSecret) {
    logger.error('stripe_app_signing_secret_missing')
    return Result.err(
      new InternalServerError({ message: 'Stripe App signing secret is not configured' }),
    )
  }

  const signatureVerifier = StripeClient.webhooks.signature
  if (!signatureVerifier) {
    logger.error('stripe_app_signature_verifier_unavailable')
    return Result.err(new InternalServerError())
  }

  const signedPayload = JSON.stringify({
    livemode: parsed.data.livemode,
    user_id: parsed.data.user_id,
    account_id: parsed.data.account_id,
  })

  try {
    await signatureVerifier.verifyHeaderAsync(signedPayload, signature, appSigningSecret)
  } catch (error) {
    logger.error('stripe_app_signature_invalid', {
      error,
      accountId: parsed.data.account_id,
      userId: parsed.data.user_id,
    })
    return Result.err(new AuthenticationError({ message: 'Invalid Stripe App signature' }))
  }

  return Result.ok({
    userId: parsed.data.user_id,
    accountId: parsed.data.account_id,
    livemode: parsed.data.livemode,
  })
}
