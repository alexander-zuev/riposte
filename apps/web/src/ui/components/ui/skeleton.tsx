import { cn } from '@web/lib/utils'
import * as React from 'react'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse rounded-none bg-muted', className)}
      {...props}
    />
  )
}

export { Skeleton }
