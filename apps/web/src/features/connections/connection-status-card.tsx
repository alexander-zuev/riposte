import { Badge } from '@web/ui/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/ui/components/ui/card'
import type { ComponentProps, ComponentType, ReactNode } from 'react'

export type BadgeVariant = ComponentProps<typeof Badge>['variant']

export type ConnectionStatus = {
  variant: BadgeVariant
  label: string
}

export function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-4">
      <div>
        <h3>{title}</h3>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

export function ConnectionStatusCard({
  icon: Icon,
  title,
  description,
  status,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  status: ConnectionStatus
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <CardAction className="static col-auto row-auto justify-self-start sm:justify-self-end">
          <Badge variant={status.variant}>{status.label}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  )
}

export function CardErrorMessage({ message }: { message: string | null }) {
  return (
    <small className="text-destructive-muted-foreground" aria-live="polite">
      {message ?? ' '}
    </small>
  )
}
