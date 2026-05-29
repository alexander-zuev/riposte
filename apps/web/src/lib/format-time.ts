/**
 * Human-friendly relative time, e.g. "now", "5 minutes ago", "yesterday".
 * Returns 'unknown time' for unparseable input.
 */
export function formatRelativeTime(value: string): string {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return 'unknown time'
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const diffSec = Math.round((then - Date.now()) / 1000)
  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second')
  const diffMin = Math.round(diffSec / 60)
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')
  const diffHr = Math.round(diffMin / 60)
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour')
  return rtf.format(Math.round(diffHr / 24), 'day')
}
