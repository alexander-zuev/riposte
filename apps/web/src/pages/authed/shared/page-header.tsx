import type { Icon } from '@phosphor-icons/react'
import { Badge } from '@web/ui/components/ui/badge'
import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
  icon?: Icon
  action?: ReactNode
}

export function PageHeader({ title, description, eyebrow, icon: Icon, action }: PageHeaderProps) {
  const hasMeta = eyebrow || Icon

  return (
    <header className="flex items-end justify-between gap-4">
      <div className="max-w-3xl">
        {hasMeta ? (
          <div className="flex items-center gap-2">
            {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
            {eyebrow ? <Badge variant="secondary">{eyebrow}</Badge> : null}
          </div>
        ) : null}
        <h1 className={hasMeta ? 'mt-3' : undefined}>{title}</h1>
        {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}
