import { ListChecksIcon } from '@phosphor-icons/react'

import { SurfaceStubPage } from '../surface-stub-page'

export function DisputesPage() {
  return (
    <SurfaceStubPage
      title="Disputes"
      description="Dispute list and metrics for synced, imported, and webhook-created Stripe cases"
      icon={ListChecksIcon}
      sections={[
        {
          title: 'Case table',
          description: 'Primary worklist for every Stripe dispute Riposte knows about',
          items: ['Status', 'Reason', 'Due date'],
        },
        {
          title: 'Evidence state',
          description: 'Packet readiness and missing inputs for each case',
          items: ['Evidence quality', 'PDF artifact', 'Required actions'],
        },
        {
          title: 'Outcomes',
          description: 'Recovered value and operational sync metrics',
          items: ['Last sync', 'Recovered amount', 'Net recovered ROI'],
        },
      ]}
    />
  )
}
