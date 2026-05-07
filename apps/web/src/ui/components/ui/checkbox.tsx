'use client'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { CheckIcon } from '@phosphor-icons/react'
import { cn } from '@web/lib/utils'
import * as React from 'react'

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props): React.JSX.Element {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer relative flex size-4 shrink-0 items-center justify-center rounded-none border border-border-non-interactive transition-colors hover:border-border-interactive outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-ring-destructive aria-invalid:aria-checked:border-accent dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-accent data-checked:bg-accent data-checked:text-accent-foreground dark:data-checked:bg-accent',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckIcon weight="bold" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
