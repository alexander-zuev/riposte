import { ArrowSquareOutIcon, EnvelopeSimpleIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@web/ui/components/ui/button'
import { Card } from '@web/ui/components/ui/card'

const EMAIL_TEMPLATE_IDS = ['magic-link', 'welcome'] as const
type EmailTemplateId = (typeof EMAIL_TEMPLATE_IDS)[number]

function isEmailTemplateId(value: unknown): value is EmailTemplateId {
  return EMAIL_TEMPLATE_IDS.some((id) => id === value)
}

export const Route = createFileRoute('/dev/emails/preview')({
  validateSearch: (search: Record<string, unknown>) => ({
    template: isEmailTemplateId(search.template) ? search.template : 'magic-link',
  }),
  component: EmailPreviewPage,
})

function EmailPreviewPage() {
  const { template } = Route.useSearch()
  const previewSrc = `/api/dev/emails/preview?template=${template}`

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h2 className="m-0">Email preview</h2>
          <p className="m-0 text-muted-foreground">{template}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link to="/dev/emails" />} variant="secondary">
            Back to emails
          </Button>
          <Button
            render={
              <a
                href={`/api/dev/emails/preview?template=${template}&send=1`}
                aria-label="Send test email"
              />
            }
            variant="secondary"
          >
            <PaperPlaneTiltIcon data-icon="inline-start" />
            Send test
          </Button>
          <Button
            render={
              <a href={previewSrc} target="_blank" rel="noreferrer" aria-label="Open raw email" />
            }
          >
            <ArrowSquareOutIcon data-icon="inline-start" />
            Open raw
          </Button>
        </div>
      </div>

      <Card className="min-h-[78vh] p-0">
        <iframe
          title={`${template} email preview`}
          src={previewSrc}
          className="h-[78vh] w-full border-0 bg-background"
        />
      </Card>
    </section>
  )
}
