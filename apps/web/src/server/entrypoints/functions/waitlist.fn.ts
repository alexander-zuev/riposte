import { ok } from '@riposte/core'
import { createDatabase } from '@server/infrastructure/db/connection'
import { WaitlistRepository } from '@server/infrastructure/repositories/waitlist.repository'
import { createServerFn } from '@tanstack/react-start'
import { env } from 'cloudflare:workers'
import { z } from 'zod'

export const joinWaitlistInput = z.object({
  email: z.email({ error: 'Please enter a valid email address' }),
})
export type JoinWaitlistInput = z.infer<typeof joinWaitlistInput>

export const joinWaitlist = createServerFn()
  .inputValidator(joinWaitlistInput)
  .handler(async ({ data }) => {
    const db = createDatabase(env as Env)
    const repo = new WaitlistRepository(db)
    await repo.addEmail(data.email)
    return ok(null)
  })
