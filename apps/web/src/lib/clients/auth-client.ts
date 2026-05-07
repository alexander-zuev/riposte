import { stripeClient } from '@better-auth/stripe/client'
import {
  inferAdditionalFields,
  lastLoginMethodClient,
  magicLinkClient,
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  plugins: [
    magicLinkClient(),
    lastLoginMethodClient(),
    stripeClient(),
    inferAdditionalFields({
      user: {
        stripeCustomerId: {
          type: 'string',
          required: false,
        },
      },
    }),
  ],
})
