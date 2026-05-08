import type { Icon } from '@phosphor-icons/react'
import { Badge } from '@web/ui/components/ui/badge'

type PageHeaderProps = {
  title: string
  description: string
  eyebrow: string
  icon: Icon
}

export function PageHeader({ title, description, eyebrow, icon: Icon }: PageHeaderProps) {
  return (
    <header className="max-w-3xl">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <Badge variant="secondary">{eyebrow}</Badge>
      </div>
      <h1 className="mt-3">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
    </header>
  )
}
