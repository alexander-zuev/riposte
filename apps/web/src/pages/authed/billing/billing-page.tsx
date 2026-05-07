import { CreditCardIcon } from '@phosphor-icons/react'

import { SurfaceStubPage } from '../surface-stub-page'

export function BillingPage() {
  return (
    <SurfaceStubPage
      title="Billing"
      description="Payment gate for plan status, payment method, usage, recovered value, and live-submission access"
      icon={CreditCardIcon}
      sections={[
        {
          title: 'Plan',
          description: 'Workspace billing status for Riposte access',
          items: ['Current plan', 'Subscription state', 'Checkout gate'],
        },
        {
          title: 'Payment method',
          description: 'Stripe-backed billing method and invoice access',
          items: ['Customer record', 'Default method', 'Invoice history'],
        },
        {
          title: 'Value',
          description: 'Recovered dispute value tied back to billing and ROI',
          items: ['Recovered amount', 'Usage count', 'Net recovered'],
        },
      ]}
    />
  )
}
