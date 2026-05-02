import { z } from 'zod'

import { baseEventSchema } from '../base/base.messages'

export const r2EventSchema = baseEventSchema.extend({
  name: z.literal('R2Event'),
  payload: z.record(z.string(), z.unknown()),
})

export type R2Event = z.infer<typeof r2EventSchema>

export const r2EventTransform = z
  .record(z.string(), z.unknown())
  .transform((raw) => ({
    id: crypto.randomUUID(),
    type: 'event' as const,
    name: 'R2Event' as const,
    timestamp: new Date().toISOString(),
    payload: raw,
  }))
