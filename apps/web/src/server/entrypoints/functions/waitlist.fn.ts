import { createCommand, toServerFnRpc } from '@riposte/core'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export const joinWaitlistInput = z.object({
  email: z.email({ error: 'Please enter a valid email address' }),
})
export type JoinWaitlistInput = z.infer<typeof joinWaitlistInput>

export const joinWaitlist = createServerFn()
  .inputValidator(joinWaitlistInput)
  .handler(async ({ data, context }) => {
    const deps = context.deps
    const command = createCommand('JoinWaitlist', { email: data.email })
    const result = await deps.services.messageBus().handle(command)

    return toServerFnRpc(result)
  })
