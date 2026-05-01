import { cn } from '@web/lib/utils'
import * as React from 'react'

function Label({ className, ...props }: React.ComponentProps<'label'>): React.JSX.Element {
  return (
    // oxlint-disable-next-line jsx-a11y/label-has-associated-control -- htmlFor passed via props
    <label
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-xs leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Label }
