import { GearSixIcon } from '@phosphor-icons/react'

import { SurfaceStubPage } from '../surface-stub-page'

export function SettingsPage() {
  return (
    <SurfaceStubPage
      title="Settings"
      description="Workspace configuration for notifications, submission policy, account, and security access"
      icon={GearSixIcon}
      sections={[
        {
          title: 'Notifications',
          description: 'Escalation channels for disputes and blocked setup',
          items: ['Email alerts', 'Slack channel', 'Outcome updates'],
        },
        {
          title: 'Autopilot',
          description: 'Submission policy and review thresholds',
          items: ['Review mode', 'Auto-submit threshold', 'Manual queue'],
        },
        {
          title: 'Account',
          description: 'Workspace and security settings',
          items: ['Profile', 'Access control', 'Connected accounts'],
        },
      ]}
    />
  )
}
