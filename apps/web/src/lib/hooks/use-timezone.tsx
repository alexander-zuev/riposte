import { setTimezoneServerFn } from '@web/server/entrypoints/functions/timezone.fn'
import type { PropsWithChildren } from 'react'
import { createContext, use, useEffect, useState } from 'react'

/**
 * Visitor's IANA timezone. Defaults to `'UTC'` so components render without a provider (Storybook,
 * tests). The app wraps everything in `TimezoneProvider`, which supplies the real zone.
 */
const TimezoneContext = createContext<string>('UTC')

/**
 * Initialized from the `tz` cookie via the root loader so SSR and the first client render agree (no
 * hydration mismatch). After mount it detects the real zone; if it differs (no cookie yet, or
 * travel) it localizes this session (state) and persists the cookie (server fn) so the next load
 * renders local with no flip.
 */
export function TimezoneProvider({
  timeZone: initial,
  children,
}: PropsWithChildren<{ timeZone: string }>) {
  const [timeZone, setTimeZone] = useState(initial)

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (detected && detected !== initial) {
      setTimeZone(detected)
      setTimezoneServerFn({ data: { timeZone: detected } }).catch(() => undefined)
    }
  }, [initial])

  return <TimezoneContext value={timeZone}>{children}</TimezoneContext>
}

/** Current IANA timezone for formatting timestamps. Pass it to `formatInTimeZone`. */
export function useTimezone(): string {
  return use(TimezoneContext)
}
