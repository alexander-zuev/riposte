import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/ui/components/ui/card'

import { DEV_NAV_ITEMS } from './route'

export const Route = createFileRoute('/dev/')({
  component: DevIndexPage,
})

function DevIndexPage() {
  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="m-0">Development tools</h2>
        <p className="m-0 max-w-2xl text-muted-foreground">
          Local-only routes for inspecting generated artifacts and integration surfaces.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {DEV_NAV_ITEMS.filter((item) => item.to !== '/dev').map((item) => {
          const Icon = item.icon

          return (
            <Link key={item.to} to={item.to} className="block no-underline hover:no-underline">
              <Card className="h-full transition-colors hover:bg-surface-hover">
                <CardHeader>
                  <CardTitle className="m-0 flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" />
                    {item.label}
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="m-0 text-xs text-muted-foreground">{item.to}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
