import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { IconContext } from '@phosphor-icons/react'
import { cn } from '@web/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-ring-destructive dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-muted text-foreground',
        outline: 'border-border text-foreground',
        success: 'bg-success-muted text-success-muted-foreground',
        destructive: 'bg-destructive-muted text-destructive-muted-foreground',
        warning: 'bg-warning-muted text-warning-muted-foreground',
        info: 'bg-info-muted text-info-muted-foreground',
        accent: 'bg-accent-muted text-accent-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const BADGE_ICON_CONTEXT = { weight: 'fill' as const }

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>): React.JSX.Element {
  return (
    <IconContext.Provider value={BADGE_ICON_CONTEXT}>
      {useRender({
        defaultTagName: 'span',
        props: mergeProps<'span'>(
          {
            className: cn(badgeVariants({ variant }), className),
          },
          props,
        ),
        render,
        state: {
          slot: 'badge',
          variant,
        },
      })}
    </IconContext.Provider>
  )
}

export { Badge, badgeVariants }
