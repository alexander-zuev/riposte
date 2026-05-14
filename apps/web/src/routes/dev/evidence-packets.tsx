import {
  CheckCircleIcon,
  FilePdfIcon,
  LockSimpleIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react'
import {
  DISPUTE_REASON_WORKFLOW,
  STRIPE_DISPUTE_REASON_CODE_CATEGORIES,
  STRIPE_DISPUTE_REASON_CODE_CATEGORY_DETAILS,
  type StripeDisputeReasonCodeCategory,
} from '@riposte/core/client'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@web/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/ui/components/ui/card'

const VISUAL_EVIDENCE_CATEGORIES = STRIPE_DISPUTE_REASON_CODE_CATEGORIES.filter(
  (category) => STRIPE_DISPUTE_REASON_CODE_CATEGORY_DETAILS[category].hasVisualEvidenceGuidelines,
)

type EvidencePacketSearch = {
  category: StripeDisputeReasonCodeCategory
}

function isSupportedEvidencePacketReason(
  category: StripeDisputeReasonCodeCategory,
): boolean {
  const workflow = DISPUTE_REASON_WORKFLOW[category]
  return workflow.evidencePacket.supported
}

export const Route = createFileRoute('/dev/evidence-packets')({
  validateSearch: (search: Record<string, unknown>): EvidencePacketSearch => {
    const category = VISUAL_EVIDENCE_CATEGORIES.includes(
      search.category as StripeDisputeReasonCodeCategory,
    )
      ? (search.category as StripeDisputeReasonCodeCategory)
      : 'fraudulent'

    return { category }
  },
  component: EvidencePacketsDevPage,
})

function EvidencePacketsDevPage() {
  const { category } = Route.useSearch()
  const supported = isSupportedEvidencePacketReason(category)
  const previewCategory = supported ? category : 'fraudulent'
  const pdfSrc = `/dev/evidence-packets/pdf?category=${previewCategory}`

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
          {VISUAL_EVIDENCE_CATEGORIES.map((item) => {
            const itemSupported = isSupportedEvidencePacketReason(item)
            const Icon = itemSupported ? ShieldCheckIcon : LockSimpleIcon

            return (
              <Link
                key={item}
                to="/dev/evidence-packets"
                search={{ category: item }}
                className="block no-underline hover:no-underline"
              >
                <Card
                  size="sm"
                  className={
                    item === category
                      ? 'bg-surface-hover ring-primary'
                      : itemSupported
                        ? 'transition-colors hover:bg-surface-hover'
                        : 'opacity-55'
                  }
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {STRIPE_DISPUTE_REASON_CODE_CATEGORY_DETAILS[item].label}
                        </span>
                      </span>
                      {itemSupported && <CheckCircleIcon className="size-4 text-primary" />}
                    </CardTitle>
                    <CardDescription>
                      {STRIPE_DISPUTE_REASON_CODE_CATEGORY_DETAILS[item].internalHandlingNote}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="m-0 text-xs text-muted-foreground">
                      {itemSupported ? 'Supported preview' : 'Not implemented yet'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <Card className="min-h-[78vh] p-0">
          {supported ? (
            <iframe
              title={`${STRIPE_DISPUTE_REASON_CODE_CATEGORY_DETAILS[previewCategory].label} evidence PDF preview`}
              src={pdfSrc}
              className="h-[78vh] w-full border-0 bg-background"
            />
          ) : (
            <div className="grid min-h-[78vh] place-items-center p-8 text-center">
              <div className="grid max-w-sm gap-2">
                <LockSimpleIcon className="mx-auto size-6 text-muted-foreground" />
                <h3 className="m-0">
                  {STRIPE_DISPUTE_REASON_CODE_CATEGORY_DETAILS[category].label} is not implemented
                </h3>
                <p className="m-0 text-muted-foreground">
                  Fraudulent is the only evidence PDF category wired into generation right now.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  )
}
