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
      description="Versioned markdown that tells the runtime agent how to extract evidence for this product"
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
          title: 'Upload',
          description: 'Edit locally and re-upload markdown',
          items: ['Download', 'Edit', 'Upload new version'],
        },
      ]}
    />
  )
}
