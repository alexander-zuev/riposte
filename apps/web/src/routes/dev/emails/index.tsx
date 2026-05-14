import { EnvelopeSimpleIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@web/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/ui/components/ui/card'

const EMAIL_TEMPLATES = [
  {
    id: 'magic-link',
    title: 'Magic link',
    description: 'Sent when a user requests a passwordless sign-in link',
    category: 'auth',
    subject: 'Your sign-in link for Riposte',
  },
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Sent after account creation',
    category: 'lifecycle',
    subject: 'Welcome to Riposte',
  },
] as const

export const Route = createFileRoute('/dev/emails/')({
  component: EmailsDevPage,
})

function EmailsDevPage() {
  return (
    <section className="grid gap-6">
      <div className="grid gap-1">
        <h2 className="m-0">Email templates</h2>
        <p className="m-0 max-w-2xl text-muted-foreground">
          Preview development email templates and send a test copy through the real email service.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {EMAIL_TEMPLATES.map((template) => (
          <Card key={template.id} className="transition-colors hover:bg-surface-hover">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2">
                  <EnvelopeSimpleIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{template.title}</span>
                </span>
                <span className="bg-muted px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                  {template.category}
                </span>
              </CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="m-0 text-xs text-muted-foreground">Subject: {template.subject}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  render={<Link to="/dev/emails/preview" search={{ template: template.id }} />}
                  variant="secondary"
                  size="sm"
                >
                  <EnvelopeSimpleIcon data-icon="inline-start" />
                  Preview
                </Button>
                <Button
                  render={
                    <a
                      href={`/api/dev/emails/preview?template=${template.id}&send=1`}
                      aria-label={`Send ${template.title} test email`}
                    />
                  }
                  variant="secondary"
                  size="sm"
                >
                  <PaperPlaneTiltIcon data-icon="inline-start" />
                  Send test
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
