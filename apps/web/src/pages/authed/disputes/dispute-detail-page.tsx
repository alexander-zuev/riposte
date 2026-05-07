import { FileTextIcon } from '@phosphor-icons/react'

import { SurfaceStubPage } from '../surface-stub-page'

interface DisputeDetailPageProps {
  disputeId: string
}

export function DisputeDetailPage({ disputeId }: DisputeDetailPageProps) {
  return (
    <SurfaceStubPage
      title={`Dispute ${disputeId}`}
      description="Case detail for status, evidence packet, required actions, deadline, outcome, and agent activity"
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
          title: 'Agent console',
          description: 'Case-scoped activity log and founder corrections',
          items: ['Runtime actions', 'Blocked steps', 'Founder input'],
        },
      ]}
    />
  )
}
