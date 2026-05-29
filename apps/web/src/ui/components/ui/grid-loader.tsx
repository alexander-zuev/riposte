import { cn } from '@web/lib/utils'

// Each dot blinks on its own period + offset. The durations share no common
// multiple, so the lit dots drift permanently out of phase and read as random
// "computation" — with no JS, timers, or re-renders. Only `opacity` animates,
// so the whole effect stays on the compositor (no paint/layout).
const CELLS = [
  { duration: 1.1, delay: 0 },
  { duration: 0.7, delay: 0.45 },
  { duration: 1.3, delay: 0.2 },
  { duration: 0.9, delay: 0.65 },
  { duration: 1.5, delay: 0.1 },
  { duration: 0.8, delay: 0.5 },
  { duration: 1.2, delay: 0.3 },
  { duration: 1.0, delay: 0.75 },
  { duration: 1.4, delay: 0.15 },
] as const

export function GridLoader({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('grid size-4 shrink-0 grid-cols-3 place-content-center gap-px', className)}
    >
      {CELLS.map((cell) => (
        <span
          key={`${cell.duration}x${cell.delay}`}
          className="size-1 rounded-[1px] bg-muted-foreground animate-grid-compute"
          style={{ animationDuration: `${cell.duration}s`, animationDelay: `${cell.delay}s` }}
        />
      ))}
    </div>
  )
}
