import type Stripe from 'stripe'

// Stripe Apps OAuth access tokens expire in 1 hour:
// https://docs.stripe.com/stripe-apps/api-authentication/oauth#refresh-your-access-token
export const STRIPE_APPS_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000

type StripeOAuthToken = Awaited<ReturnType<Stripe['oauth']['token']>>

export function getRequiredOAuthTokenFields(token: StripeOAuthToken):
  | {
      stripeAccountId: string
      livemode: boolean
      accessToken: string
      refreshToken: string
    }
  | undefined {
  if (!token.stripe_user_id) return undefined
  if (typeof token.livemode !== 'boolean') return undefined
  if (!token.access_token) return undefined
  if (!token.refresh_token) return undefined

  return {
    stripeAccountId: token.stripe_user_id,
    livemode: token.livemode,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
  }
}
