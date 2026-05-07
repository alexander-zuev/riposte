import { createFileRoute } from '@tanstack/react-router'
import { zodValidator } from '@tanstack/zod-adapter'
import { authQueries } from '@web/entities/auth'
import { SignInPage } from '@web/pages/public/sign-in/sign-in-page'
import { z } from 'zod'

const signInSearchSchema = z.object({
  redirectTo: z
    .string()
    .optional()
    .catch(undefined)
    .transform((value) => {
      if (!value) return undefined
      if (!value.startsWith('/') || value.startsWith('//')) return undefined
      if (value === '/sign-in' || value.startsWith('/sign-in?')) return undefined
      return value
    }),
})

export const Route = createFileRoute('/_public/sign-in')({
  validateSearch: zodValidator(signInSearchSchema),
  loader: ({ context }) => context.queryClient.prefetchQuery(authQueries.lastLoginMethod()),
  component: SignInPage,
})
