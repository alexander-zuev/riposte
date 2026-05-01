import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { betterAuth } from 'better-auth/minimal'

import { createBetterAuthOptions } from './options'

const adapter = drizzleAdapter({} as any, { provider: 'sqlite' })

export const auth = betterAuth(createBetterAuthOptions(adapter))
