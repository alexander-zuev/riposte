import type { Icon } from '@phosphor-icons/react'
import { cn } from '@web/lib/utils'
import type { ReactNode } from 'react'

type FullPageStatusTone = 'neutral' | 'destructive'

const toneClasses: Record<
  FullPageStatusTone,
  {
    icon: string
  }
> = {
  neutral: {
    icon: 'text-muted-foreground',
  },
  destructive: {
    icon: 'text-destructive',
  },
}

interface FullPageStatusProps {
  icon: Icon
  title: string
  subtitle?: string
  actions?: ReactNode
  tone?: FullPageStatusTone
  role?: 'alert' | 'status'
}

export function FullPageStatus({
  icon: StatusIcon,
  title,
  subtitle,
  actions,
  tone = 'neutral',
  role = 'status',
}: FullPageStatusProps) {
  const classes = toneClasses[tone]

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <section
        className="flex w-full max-w-md flex-col items-center gap-5 text-center"
        aria-labelledby="full-page-status-title"
        role={role}
      >
        <div className="flex size-14 items-center justify-center" aria-hidden="true">
          <StatusIcon className={cn('size-10', classes.icon)} weight="duotone" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 id="full-page-status-title" className="text-balance">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-sm leading-6 text-pretty text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>

        {actions ? <div className="flex flex-wrap justify-center gap-2">{actions}</div> : null}
      </section>
    </main>
  )
}
