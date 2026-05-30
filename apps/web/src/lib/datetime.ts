/**
 * Absolute-timestamp formatting in an explicit IANA timezone. The zone comes from `useTimezone()`
 * (visitor-local) or a literal like `'UTC'`. Locale is fixed to `en-US` so the server and client
 * never disagree on month names or order. Formatter instances are cached per (zone, options).
 */
const formatterCache = new Map<string, Intl.DateTimeFormat>()

function getFormatter(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${timeZone}|${JSON.stringify(options)}`
  const cached = formatterCache.get(key)
  if (cached) return cached
  const formatter = new Intl.DateTimeFormat('en-US', { ...options, timeZone })
  formatterCache.set(key, formatter)
  return formatter
}

/**
 * Format an ISO timestamp in the given timezone. Returns `null` for missing/unparseable input so
 * callers apply their own fallback.
 */
export function formatInTimeZone(
  iso: string | undefined | null,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return getFormatter(timeZone, options).format(date)
}
