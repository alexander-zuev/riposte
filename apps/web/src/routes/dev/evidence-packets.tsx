import { CheckCircleIcon, FilePdfIcon, ShieldCheckIcon } from '@phosphor-icons/react'
import type { DevEvidencePdfCategory } from '@server/infrastructure/pdf/dev-dispute-evidence-pdf-fixtures'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@web/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/ui/components/ui/card'

type EvidencePacketSearch = {
  category: DevEvidencePdfCategory
}

const DEV_EVIDENCE_PDF_PREVIEWS = [
  {
    category: 'fraudulent',
    label: 'Fraudulent',
    description: 'Preview the fraud evidence packet generated from domain dispute facts',
  },
  {
    category: 'unrecognized',
    label: 'Unrecognized',
    description: 'Preview the unrecognized-payment evidence packet using the fraud-adjacent shape',
  },
] as const satisfies readonly {
  category: DevEvidencePdfCategory
  label: string
  description: string
}[]

export const Route = createFileRoute('/dev/evidence-packets')({
  validateSearch: (search: Record<string, unknown>): EvidencePacketSearch => {
    const category = DEV_EVIDENCE_PDF_PREVIEWS.some((item) => item.category === search.category)
      ? (search.category as DevEvidencePdfCategory)
      : 'fraudulent'

    return { category }
  },
  component: EvidencePacketsDevPage,
})

function EvidencePacketsDevPage() {
  const { category } = Route.useSearch()
  const descriptor = DEV_EVIDENCE_PDF_PREVIEWS.find((item) => item.category === category)
  const pdfSrc = `/dev/evidence-packets/pdf?category=${category}`

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h2 className="m-0">Evidence PDFs</h2>
          <p className="m-0 max-w-2xl text-muted-foreground">
            Preview dispute evidence packets using the same domain models and PDF document shape
            that production generation uses.
          </p>
        </div>
        <Button
          render={
            <a href={pdfSrc} target="_blank" rel="noreferrer" aria-label="Open evidence PDF" />
          }
          variant="secondary"
        >
          <FilePdfIcon data-icon="inline-start" />
          Open PDF
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="grid content-start gap-3">
          {DEV_EVIDENCE_PDF_PREVIEWS.map((item) => {
            return (
              <Link
                key={item.category}
                to="/dev/evidence-packets"
                search={{ category: item.category }}
                className="block no-underline hover:no-underline"
              >
                <Card
                  size="sm"
                  className={
                    item.category === category
                      ? 'bg-surface-hover ring-primary'
                      : 'transition-colors hover:bg-surface-hover'
                  }
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <ShieldCheckIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <CheckCircleIcon className="size-4 text-primary" />
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="m-0 text-xs text-muted-foreground">
                      {item.category}/digital_product_or_service
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <Card className="min-h-[78vh] p-0">
          <object
            title={`${descriptor?.label ?? category} evidence PDF preview`}
            data={pdfSrc}
            type="application/pdf"
            className="h-[78vh] w-full bg-background"
          >
            <div className="grid min-h-[78vh] place-items-center p-8 text-center">
              <div className="grid max-w-sm gap-2">
                <FilePdfIcon className="mx-auto size-6 text-muted-foreground" />
                <h3 className="m-0">PDF preview unavailable</h3>
                <p className="m-0 text-muted-foreground">
                  Open the PDF in a new tab to review the generated evidence packet.
                </p>
              </div>
            </div>
          </object>
        </Card>
      </div>
    </section>
  )
}
