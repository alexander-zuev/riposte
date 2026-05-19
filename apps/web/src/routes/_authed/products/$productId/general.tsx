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
      description="Product identity and danger zone"
      icon={IdentificationCardIcon}
      sections={[
        {
          title: 'Identity',
          description: 'Name and URL the customer recognizes',
          items: ['Product name', 'Primary domain', 'Product type'],
        },
        {
          title: 'Danger zone',
          description: 'Destructive actions that cannot be undone',
          items: ['Archive product', 'Delete product'],
        },
      ]}
    />
  )
}
