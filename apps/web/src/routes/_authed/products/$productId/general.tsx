import { IdentificationCardIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { SurfaceStubPage } from '@web/pages/authed/surface-stub-page'

export const Route = createFileRoute('/_authed/products/$productId/general')({
  component: GeneralPage,
})

function GeneralPage() {
  return (
    <SurfaceStubPage
      title="General"
      description="Identity, Stripe-submittable fields, and danger zone for this product"
      icon={IdentificationCardIcon}
      sections={[
        {
          title: 'Identity',
          description: 'Name and URL the customer recognizes',
          items: ['Product name', 'Primary domain', 'Product type'],
        },
        {
          title: 'Stripe text fields',
          description: 'Verbatim copy used in dispute submissions',
          items: ['Product description', 'Service-start rule', 'Service date source'],
        },
        {
          title: 'Policy disclosures',
          description: 'How / when the customer was shown each policy',
          items: ['Refund policy disclosure', 'Cancellation policy disclosure'],
        },
      ]}
    />
  )
}
