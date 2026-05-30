import { UserCircleIcon } from '@phosphor-icons/react'
import type { AuthUser } from '@web/entities/auth/auth-user'
import { formatInTimeZone } from '@web/lib/datetime'
import { useTimezone } from '@web/lib/hooks/use-timezone'
import { PageHeader } from '@web/pages/authed/shared/page-header'
import { UserAvatar } from '@web/pages/authed/shared/user-dropdown'
import { Card, CardContent } from '@web/ui/components/ui/card'

interface AccountPageProps {
  user: AuthUser
}

export function AccountPage({ user }: AccountPageProps) {
  const timeZone = useTimezone()

  return (
    <div className="grid gap-6 text-foreground">
      <PageHeader
        title="Account"
        description="Personal profile and sign-in details for your Riposte workspace user"
        eyebrow="Workspace"
        icon={UserCircleIcon}
      />

      <Card>
        <CardContent>
          <div className="flex items-center gap-4">
            <UserAvatar user={user} className="size-12" />
            <dl className="grid min-w-0 flex-1 gap-4 sm:grid-cols-3">
              <AccountField label="Name" value={user.displayName ?? 'Not set'} />
              <AccountField label="Email" value={user.email} />
              <AccountField
                label="Date registered"
                value={formatRegisteredDate(user.createdAt, timeZone)}
              />
            </dl>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function AccountField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt>
        <small className="text-muted-foreground">{label}</small>
      </dt>
      <dd className="mt-1 truncate font-medium">{value}</dd>
    </div>
  )
}

function formatRegisteredDate(value: Date | string | number, timeZone: string) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return formatInTimeZone(date.toISOString(), timeZone, { dateStyle: 'medium' }) ?? 'Unknown'
}
