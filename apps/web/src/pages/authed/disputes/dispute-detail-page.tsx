import { FileTextIcon } from '@phosphor-icons/react'

import { SurfaceStubPage } from '../surface-stub-page'

interface DisputeDetailPageProps {
  disputeId: string
}

export function DisputeDetailPage({ disputeId }: DisputeDetailPageProps) {
  return (
    <SurfaceStubPage
      title={`Dispute ${disputeId}`}
      description="Case detail for status, evidence packet, required actions, deadline, and outcome"
      icon={FileTextIcon}
      sections={[
        {
          title: 'Case state',
          description: 'Stripe-facing state for this dispute',
          items: ['Deadline', 'Outcome', 'Submission mode'],
        },
        {
          title: 'Evidence packet',
          description: 'Source-backed fields and generated artifacts',
          items: ['Timeline', 'Usage evidence', 'PDF links'],
        },
        {
          title: 'Founder input',
          description: 'Blocked steps and founder corrections for this case',
          items: ['Blocked steps', 'Founder input', 'Resume'],
        },
      ]}
    />
  )
}
