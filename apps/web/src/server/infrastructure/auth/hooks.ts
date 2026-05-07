import { createCommand, createEvent } from '@riposte/core'
import { createLogger } from '@riposte/core/client'
import type { IQueueClient } from '@server/infrastructure/queues/queue-client'
import type { User } from 'better-auth'
import type { Stripe } from 'stripe'

const logger = createLogger('auth')

type SignupMethod = 'google' | 'github' | 'magic_link'

/**
 * Maps Better Auth's lastLoginMethod to our domain signup method.
 * Better Auth plugin stores: 'google', 'github', 'magic-link'.
 * We normalize 'magic-link' to 'magic_link' for the domain event.
 */
function normalizeAuthMethod(method: string | undefined): SignupMethod {
  if (!method) return 'google'
  if (method === 'magic-link') return 'magic_link'
  if (method === 'google' || method === 'github') {
    return method
  }
  return 'google'
}

export function createDatabaseHooks(queueClient?: IQueueClient) {
  if (!queueClient) return undefined

  return {
    user: {
      create: {
        after: async (user: User & { lastLoginMethod?: string }) => {
          const signupMethod = normalizeAuthMethod(user.lastLoginMethod)

          const result = await queueClient.send(
            createEvent('UserSignedUp', {
              userId: user.id,
              email: user.email,
              signupMethod,
            }),
          )
          if (result.isErr()) throw result.error

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

export function createMagicLinkHooks(queueClient?: IQueueClient) {
  return {
    sendMagicLink: async ({ email, token, url }: { email: string; token: string; url: string }) => {
      if (!queueClient) {
        logger.warn('No queue configured, magic link not sent')
        return
      }

      const result = await queueClient.send(
        createCommand('SendMagicLink', {
          email,
          magicLinkUrl: url,
          token,
        }),
      )
      if (result.isErr()) throw result.error

      logger.info('Magic link queued', { email })
    },
  }
}

export function createStripeCustomerHooks(queueClient?: IQueueClient) {
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
      if (!queueClient) return

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
