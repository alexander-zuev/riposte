import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'

const SIDEBAR_COOKIE_NAME = 'sidebar_state'
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export const getSidebarStateServerFn = createServerFn().handler(async (): Promise<boolean> => {
  const value = getCookie(SIDEBAR_COOKIE_NAME)
  return value !== 'false'
})

export const setSidebarStateServerFn = createServerFn()
  .inputValidator((data: { open: boolean }) => data)
  .handler(async ({ data }): Promise<void> => {
    setCookie(SIDEBAR_COOKIE_NAME, String(data.open), {
      path: '/',
      maxAge: SIDEBAR_COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: 'lax',
    })
  })
