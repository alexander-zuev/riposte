import { z } from 'zod'

export const buildStripeOAuthInstallUrlResultSchema = z.object({
  url: z.url(),
})

export const handleStripeOAuthCallbackResultSchema = z.object({
  redirectAfter: z.string().startsWith('/').optional(),
})

export type BuildStripeOAuthInstallUrlResult = z.infer<
  typeof buildStripeOAuthInstallUrlResultSchema
>
export type HandleStripeOAuthCallbackResult = z.infer<
  typeof handleStripeOAuthCallbackResultSchema
>
