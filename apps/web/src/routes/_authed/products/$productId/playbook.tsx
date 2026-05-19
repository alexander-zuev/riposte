import { ScrollIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { SurfaceStubPage } from '@web/pages/authed/surface-stub-page'

export const Route = createFileRoute('/_authed/products/$productId/playbook')({
  component: PlaybookPage,
})

function PlaybookPage() {
  return (
    <SurfaceStubPage
      title="Playbook"
      description="Everything the runtime agent submits to Stripe — rules, text fields, and policy disclosures"
      icon={ScrollIcon}
      sections={[
        {
          title: 'Current version',
          description: 'Active playbook used by the runtime agent',
          items: ['Version', 'Last generated', 'Commit hash'],
        },
        {
          title: 'Build via chat',
          description: 'Onboarding agent generates and iterates the playbook in chat',
          items: ['Chat surface', 'Dry-run dispute', 'Commit v(N+1)'],
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
        {
          title: 'Upload',
          description: 'Edit locally and re-upload markdown',
          items: ['Download', 'Edit', 'Upload new version'],
        },
      ]}
    />
  )
}
