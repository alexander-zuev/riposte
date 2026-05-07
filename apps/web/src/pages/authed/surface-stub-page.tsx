import type { Icon } from '@phosphor-icons/react'
import { CheckCircleIcon } from '@phosphor-icons/react'
import { Badge } from '@web/ui/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/ui/components/ui/card'

interface SurfaceStubPageProps {
  title: string
  description: string
  icon: Icon
  sections: Array<{
    title: string
    description: string
    items: string[]
  }>
}

export function SurfaceStubPage({
  title,
  description,
  icon: Icon,
  sections,
}: SurfaceStubPageProps) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <header className="max-w-3xl">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            <Badge variant="secondary">Stub</Badge>
          </div>
          <h1 className="mt-3">{title}</h1>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircleIcon className="size-4 text-muted-foreground" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="size-1.5 shrink-0 bg-muted-foreground" />
                      <small>{item}</small>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}
