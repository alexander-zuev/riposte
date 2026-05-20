import { BookOpenIcon, CaretDownIcon } from '@phosphor-icons/react'
import { cn } from '@web/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@web/ui/components/ui/collapsible'
import type { ComponentProps } from 'react'

export type SourcesProps = ComponentProps<'div'>

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible className={cn('not-prose w-full text-foreground text-sm', className)} {...props} />
)

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number
}

export const SourcesTrigger = ({ className, count, children, ...props }: SourcesTriggerProps) => (
  <CollapsibleTrigger
    className={cn(
      'flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground',
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        <BookOpenIcon className="size-4" />
        <p className="font-medium">Used {count} sources</p>
        <CaretDownIcon className="size-4" />
      </>
    )}
  </CollapsibleTrigger>
)

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>

export const SourcesContent = ({ className, ...props }: SourcesContentProps) => (
  <CollapsibleContent
    className={cn(
      'mt-2 flex w-fit flex-col gap-2',
      'outline-none data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=closed]:animate-out data-[state=open]:slide-in-from-top-2 data-[state=open]:animate-in',
      className,
    )}
    {...props}
  />
)

export type SourceProps = ComponentProps<'a'>

export const Source = ({ href, title, children, ...props }: SourceProps) => (
  <a
    className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
    href={href}
    rel="noreferrer"
    target="_blank"
    {...props}
  >
    {children ?? (
      <>
        <BookOpenIcon className="size-4" />
        <span className="block font-medium">{title}</span>
      </>
    )}
  </a>
)
