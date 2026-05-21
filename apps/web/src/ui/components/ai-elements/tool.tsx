import {
  CaretDownIcon,
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { cn } from '@web/lib/utils'
import { Badge } from '@web/ui/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@web/ui/components/ui/collapsible'
import type { DynamicToolUIPart, ToolUIPart } from 'ai'
import type { ComponentProps, ReactNode } from 'react'
import { isValidElement } from 'react'

import { CodeBlock } from './code-block'

export type ToolProps = ComponentProps<typeof Collapsible>

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible className={cn('group not-prose w-full', className)} {...props} />
)

export type ToolPart = ToolUIPart | DynamicToolUIPart

export type ToolHeaderProps = {
  title?: string
  className?: string
} & (
  | { type: ToolUIPart['type']; state: ToolUIPart['state']; toolName?: never }
  | {
      type: DynamicToolUIPart['type']
      state: DynamicToolUIPart['state']
      toolName: string
    }
)

const statusLabels: Record<ToolPart['state'], string> = {
  'approval-requested': 'Awaiting Approval',
  'approval-responded': 'Responded',
  'input-available': 'Running',
  'input-streaming': 'Pending',
  'output-available': 'Completed',
  'output-denied': 'Denied',
  'output-error': 'Error',
}

const statusIcons: Record<ToolPart['state'], ReactNode> = {
  'approval-requested': <ClockIcon className="size-4" />,
  'approval-responded': <CheckCircleIcon className="size-4" />,
  'input-available': <ClockIcon className="size-4 animate-pulse" />,
  'input-streaming': <CircleIcon className="size-4" weight="regular" />,
  'output-available': <CheckCircleIcon className="size-4" />,
  'output-denied': <XCircleIcon className="size-4" />,
  'output-error': <XCircleIcon className="size-4" />,
}

type BadgeVariant = ComponentProps<typeof Badge>['variant']

const statusVariants: Record<ToolPart['state'], BadgeVariant> = {
  'approval-requested': 'warning',
  'approval-responded': 'info',
  'input-available': 'secondary',
  'input-streaming': 'secondary',
  'output-available': 'success',
  'output-denied': 'secondary',
  'output-error': 'destructive',
}

export const getStatusBadge = (status: ToolPart['state']) => (
  <Badge variant={statusVariants[status]}>
    {statusIcons[status]}
    {statusLabels[status]}
  </Badge>
)

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const derivedName = type === 'dynamic-tool' ? toolName : type.split('-').slice(1).join('-')

  return (
    <CollapsibleTrigger
      className={cn(
        'flex w-full cursor-pointer items-center justify-between gap-4 text-muted-foreground text-sm transition-colors hover:text-foreground',
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <WrenchIcon className="size-4" />
        <span className="font-medium">{title ?? derivedName}</span>
        {getStatusBadge(state)}
      </div>
      <CaretDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  )
}

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'mt-2 flex flex-col gap-4 text-foreground outline-none data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=closed]:animate-out data-[state=open]:slide-in-from-top-2 data-[state=open]:animate-in',
      className,
    )}
    {...props}
  />
)

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolPart['input']
}

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn('flex flex-col gap-2 overflow-hidden', className)} {...props}>
    <small className="font-medium tracking-wide text-muted-foreground uppercase">Parameters</small>
    <div className="bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
)

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ToolPart['output']
  errorText: ToolPart['errorText']
}

export const ToolOutput = ({ className, output, errorText, ...props }: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null
  }

  let Output = <div>{output as ReactNode}</div>

  if (typeof output === 'object' && !isValidElement(output)) {
    Output = <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
  } else if (typeof output === 'string') {
    Output = <CodeBlock code={output} language="json" />
  }

  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      <small className="font-medium tracking-wide text-muted-foreground uppercase">
        {errorText ? 'Error' : 'Result'}
      </small>
      <div
        className={cn(
          'overflow-x-auto text-xs [&_table]:w-full',
          errorText ? 'bg-destructive-muted text-destructive' : 'bg-muted/50 text-foreground',
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  )
}
