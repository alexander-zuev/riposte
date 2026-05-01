import { stripeClient } from '@better-auth/stripe/client'
import type { auth } from '@web/server/infrastructure/auth/auth-gen'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  plugins: [stripeClient(), inferAdditionalFields<typeof auth>()],
})
