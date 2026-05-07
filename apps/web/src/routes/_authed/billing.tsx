import { createFileRoute } from '@tanstack/react-router'
import { BillingPage } from '@web/pages/authed/billing/billing-page'

export const Route = createFileRoute('/_authed/billing')({
  component: BillingPage,
})
