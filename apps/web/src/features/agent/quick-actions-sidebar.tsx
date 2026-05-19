import { LightningIcon, ListChecksIcon, PlugIcon, ScrollIcon } from '@phosphor-icons/react'
import { Link } from '@tanstack/react-router'
import { cn } from '@web/lib/utils'
import { buttonVariants } from '@web/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@web/ui/components/ui/card'

type QuickActionsSidebarProps = {
  productId: string
}

/**
 * Right-column sidebar shown after setup completes. Common operator shortcuts
 * (playbook, connections, disputes) plus the MVP-chat callout pinned below.
 * Visual language matches the dashboard's Autopilot / System health cards.
 */
export function QuickActionsSidebar({ productId }: QuickActionsSidebarProps) {
  const actionClass = cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full justify-start')
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LightningIcon className="size-4 text-muted-foreground" weight="duotone" />
            Quick actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1">
            <Link to="/products/$productId/playbook" params={{ productId }} className={actionClass}>
              <ScrollIcon data-icon="inline-start" weight="duotone" />
              Edit playbook
            </Link>
            <Link
              to="/products/$productId/connections"
              params={{ productId }}
              className={actionClass}
            >
              <PlugIcon data-icon="inline-start" weight="duotone" />
              Manage connections
            </Link>
            <Link to="/products/$productId/disputes" params={{ productId }} className={actionClass}>
              <ListChecksIcon data-icon="inline-start" weight="duotone" />
              View disputes
            </Link>
          </div>
        </CardContent>
      </Card>
      <p className="border border-dashed p-3 text-xs text-muted-foreground">
        Free chat with the agent is coming after MVP. The agent runs autonomously per dispute and
        the activity log shows what it has done
      </p>
    </>
  )
}
