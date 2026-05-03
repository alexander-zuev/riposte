import { createServerFn } from '@tanstack/react-start'
import { deleteCookie, getCookie } from '@tanstack/react-start/server'

export type Theme = 'light'

const storageKey = '_preferred-theme'

export const getThemeServerFn = createServerFn().handler(async () => {
  const stale = getCookie(storageKey)
  if (stale && stale !== 'light') deleteCookie(storageKey)
  return 'light' as const
})
