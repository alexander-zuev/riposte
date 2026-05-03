import { createDatabase } from '@server/infrastructure/db/connection'
import { WaitlistRepository } from '@server/infrastructure/repositories/waitlist.repository'
import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { z } from 'zod'

const joinWaitlistInput = z.object({
  email: z.email(),
})

export const joinWaitlist = createServerFn()
  .inputValidator(joinWaitlistInput)
  .handler(async ({ data }) => {
    const db = createDatabase(env as Env)
    const repo = new WaitlistRepository(db)
    await repo.addEmail(data.email)
    return { success: true as const }
  })
