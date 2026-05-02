import { z } from 'zod'

export const r2EventRawSchema = z.object({
  account: z.string(),
  action: z.enum([
    'PutObject',
    'CopyObject',
    'CompleteMultipartUpload',
    'DeleteObject',
    'LifecycleDeletion',
  ]),
  bucket: z.string(),
  object: z.object({
    key: z.string(),
    size: z.number().optional(),
    eTag: z.string().optional(),
  }),
  eventTime: z.string(),
  copySource: z
    .object({
      bucket: z.string(),
      object: z.string(),
    })
    .optional(),
})

export const r2EventNotificationSchema = r2EventRawSchema.transform((val) => ({
  name: `r2:${val.action}` as const,
  ...val,
}))

export type R2EventRaw = z.infer<typeof r2EventRawSchema>
export type R2EventNotification = z.infer<typeof r2EventNotificationSchema>
