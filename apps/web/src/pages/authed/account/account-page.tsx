import { UserIcon } from '@phosphor-icons/react'

import { SurfaceStubPage } from '../surface-stub-page'

export function AccountPage() {
  return (
    <SurfaceStubPage
      title="Account"
      description="Profile and identity settings for the current user"
      icon={UserIcon}
      sections={[
        {
          title: 'Profile',
          description: 'User-facing identity and contact details',
          items: ['Name', 'Email', 'Avatar'],
        },
        {
          title: 'Security',
          description: 'Authentication methods and active session controls',
          items: ['Login methods', 'Sessions', 'Account deletion'],
        },
        {
          title: 'Workspace',
          description: 'Default workspace membership and ownership context',
          items: ['Workspace role', 'Connected products', 'Billing access'],
        },
      ]}
    />
  )
}
