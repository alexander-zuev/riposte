import { cn } from '@web/lib/utils'

export function GridLoader({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading" className={cn('grid grid-cols-3 gap-px', className)}>
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className="rounded-px size-1 animate-grid-rain bg-foreground"
          style={{ animationDelay: `${(i % 3) * 300 + Math.floor(i / 3) * 150}ms` }}
        />
      ))}
    </div>
  )
}
