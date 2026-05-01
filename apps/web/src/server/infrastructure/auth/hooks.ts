import { createEvent } from '@riposte/core'
import { createLogger } from '@riposte/core/client'
import type { User } from 'better-auth'
import type { Stripe } from 'stripe'

const logger = createLogger('auth')

type SignupMethod = 'google' | 'github' | 'email_password'

/**
 * Maps Better Auth's lastLoginMethod to our domain signup method.
 * Better Auth plugin stores: 'google', 'github', 'email' (from auth endpoint path).
 * We normalize 'email' to 'email_password' for clarity.
 */
function normalizeAuthMethod(method: string | undefined): SignupMethod {
  if (!method) return 'google'
  if (method === 'email') return 'email_password'
  if (method === 'google' || method === 'github') {
    return method
  }
  return 'google'
}

export function createDatabaseHooks(queue?: Queue) {
  if (!queue) return undefined

  return {
    user: {
      create: {
        after: async (user: User & { lastLoginMethod?: string }) => {
          const signupMethod = normalizeAuthMethod(user.lastLoginMethod)

          await queue.send(
            createEvent('UserSignedUp', {
              userId: user.id,
              email: user.email,
              signupMethod,
            }),
          )

          logger.info('User created, queued onboarding flow', {
            userId: user.id,
            signupMethod,
            events: ['UserSignedUp'],
          })
        },
      },
    },
  }
}

export function createStripeCustomerHooks(queue?: Queue) {
  return {
    onCustomerCreate: async ({
      stripeCustomer,
      user,
    }: {
      stripeCustomer: Stripe.Customer
      user: User
    }) => {
      logger.info('Stripe customer created', {
        customerId: stripeCustomer.id,
        userId: user.id,
      })
    },

    onEvent: async (event: Stripe.Event) => {
      logger.info('stripe_event', { type: event.type, id: event.id })
      if (!queue) return

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object
          logger.info('checkout_session_completed', {
            sessionId: session.id,
            userId: session.metadata?.userId,
          })
          break
        }
        default:
          logger.debug('unhandled_stripe_event', { type: event.type })
          break
      }
    },
  }
}
