import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import * as z from 'zod'

const themeSchema = z.union([z.literal('light'), z.literal('dark')])
export type Theme = z.infer<typeof themeSchema>

const DEFAULT_THEME: Theme = 'dark'
const storageKey = '_preferred-theme'

export const getThemeServerFn = createServerFn().handler(async () => {
  const parsed = themeSchema.safeParse(getCookie(storageKey))
  return parsed.success ? parsed.data : DEFAULT_THEME
})

export const setThemeServerFn = createServerFn({ method: 'POST' })
  .inputValidator(themeSchema)
  .handler(async ({ data }) => setCookie(storageKey, data))
