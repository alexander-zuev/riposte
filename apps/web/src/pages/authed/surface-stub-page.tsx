import type { Icon } from '@phosphor-icons/react'
import { CheckCircleIcon } from '@phosphor-icons/react'
import { PageHeader } from '@web/pages/authed/shared/page-header'
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
    <div className="grid gap-6 text-foreground">
      <PageHeader title={title} description={description} eyebrow="Stub" icon={Icon} />

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
  )
}
