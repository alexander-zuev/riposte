import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import { cn } from '@web/lib/utils'
import type { ComponentProps } from 'react'
import { Streamdown } from 'streamdown'

const plugins = { cjk, code, math, mermaid }

/**
 * Renders a complete markdown document with the shared streamdown styling and plugins. Use for
 * static documents (e.g. the dispute playbook); the chat surface uses its own `MessageResponse`
 * wrapper with streaming/link-safety behavior.
 */
export function Markdown({ className, ...props }: ComponentProps<typeof Streamdown>) {
  return (
    <Streamdown
      className={cn('markdown-body [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)}
      plugins={plugins}
      {...props}
    />
  )
}
