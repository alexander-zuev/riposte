import { cn } from '@web/lib/utils'
import type { CSSProperties, ReactNode } from 'react'

/**
 * Open Graph card dimensions. Locked to the 1.91:1 ratio Facebook/X/LinkedIn
 * expect. The capture rig screenshots `[data-og-card]` at exactly these pixels,
 * so the frame uses fixed px (a real external constraint, not arbitrary layout).
 */
export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

/** Fixed-size frame every OG option renders into, tagged for the capture script. */
export function OgFrame({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      data-og-card
      style={{ width: OG_WIDTH, height: OG_HEIGHT, ...style }}
      className={cn('relative isolate flex overflow-hidden', className)}
    >
      {children}
    </div>
  )
}
