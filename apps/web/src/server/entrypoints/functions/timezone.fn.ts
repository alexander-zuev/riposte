import { createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { z } from 'zod'

const TIMEZONE_COOKIE = 'tz'
const TIMEZONE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** A timezone is valid if `Intl` accepts it; constructing a formatter throws on a bad IANA name. */
function isValidTimeZone(timeZone: string): boolean {
  try {
    const resolved = new Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions()
    return resolved.timeZone.length > 0
  } catch {
    return false
  }
}

/**
 * Read the visitor's timezone from the `tz` cookie for SSR. Defaults to UTC when absent or tampered
 * so the server and the first client render agree; the client corrects it after mount.
 */
export const getTimezoneServerFn = createServerFn().handler(async () => {
  const cookie = getCookie(TIMEZONE_COOKIE)
  return cookie && isValidTimeZone(cookie) ? cookie : 'UTC'
})

/** Persist the client-detected timezone so the next SSR renders local with no flip. */
export const setTimezoneServerFn = createServerFn()
  .inputValidator(
    z.object({
      timeZone: z.string().refine(isValidTimeZone, { error: 'Invalid IANA time zone' }),
    }),
  )
  .handler(async ({ data }) => {
    setCookie(TIMEZONE_COOKIE, data.timeZone, {
      path: '/',
      maxAge: TIMEZONE_COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: 'lax',
    })
    return null
  })
