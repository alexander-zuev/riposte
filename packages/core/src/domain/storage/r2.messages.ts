import { z } from 'zod'

import { baseEventSchema } from '../base/base.messages'

export const r2EventSchema = baseEventSchema.extend({
  name: z.literal('R2Event'),
  payload: z.record(z.string(), z.unknown()),
})

export type R2Event = z.infer<typeof r2EventSchema>

const r2NotificationSchema = z.object({
  account: z.string(),
  action: z.string(),
  bucket: z.string(),
  object: z.object({
    key: z.string(),
    size: z.number().optional(),
    eTag: z.string().optional(),
  }),
  eventTime: z.string().optional(),
  copySource: z
    .object({
      bucket: z.string(),
      object: z.string(),
    })
    .optional(),
})

export const r2EventTransform = r2NotificationSchema.transform((raw) => ({
  id: crypto.randomUUID(),
  type: 'event' as const,
  name: 'R2Event' as const,
  timestamp: raw.eventTime ?? new Date().toISOString(),
  payload: raw,
}))
