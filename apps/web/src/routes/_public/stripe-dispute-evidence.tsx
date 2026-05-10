import { createFileRoute } from '@tanstack/react-router'
import { StripeDisputeEvidencePage } from '@web/pages/public/stripe-dispute-evidence/stripe-dispute-evidence-page'

export const Route = createFileRoute('/_public/stripe-dispute-evidence')({
  component: StripeDisputeEvidencePage,
})
