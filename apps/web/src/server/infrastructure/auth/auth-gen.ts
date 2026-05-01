import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import { createBetterAuthOptions } from './options'

const adapter = drizzleAdapter({} as any, { provider: 'sqlite' })

export const auth = betterAuth(createBetterAuthOptions(adapter))
