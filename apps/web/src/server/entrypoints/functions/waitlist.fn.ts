import { createCommand, toServerFnRpc } from '@riposte/core'
import { createAppDeps } from '@server/infrastructure/app-deps'
import { createServerFn } from '@tanstack/react-start'
import { env, waitUntil } from 'cloudflare:workers'
import { z } from 'zod'

export const joinWaitlistInput = z.object({
  email: z.email({ error: 'Please enter a valid email address' }),
})
export type JoinWaitlistInput = z.infer<typeof joinWaitlistInput>

export const joinWaitlist = createServerFn()
  .inputValidator(joinWaitlistInput)
  .handler(async ({ data }) => {
    const deps = createAppDeps(env, { waitUntil })
    const command = createCommand('JoinWaitlist', { email: data.email })
    const result = await deps.services.messageBus().handle(command)

    return toServerFnRpc(result)
  })
