import { createCommand } from '@riposte/core'
import { MessageBus } from '@server/application/message-bus/message-bus'
import { serializeForRpc } from '@server/entrypoints/functions/rpc-result'
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
    const bus = new MessageBus(env as Env, { waitUntil })
    const command = createCommand('JoinWaitlist', { email: data.email })
    const result = await bus.handle(command)

    return serializeForRpc(result)
  })
