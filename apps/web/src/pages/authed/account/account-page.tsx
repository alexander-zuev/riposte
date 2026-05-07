import type { AuthUser } from '@web/entities/auth/auth-user'
import { UserAvatar } from '@web/pages/authed/shared/user-dropdown'
import { Card, CardContent, CardHeader, CardTitle } from '@web/ui/components/ui/card'

interface AccountPageProps {
  user: AuthUser
}

export function AccountPage({ user }: AccountPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-4">
          <UserAvatar user={user} className="size-16" />
          <dl className="grid min-w-0 flex-1 gap-4 sm:grid-cols-3">
            <AccountField label="Name" value={user.displayName ?? 'Not set'} />
            <AccountField label="Email" value={user.email} />
            <AccountField label="Date registered" value={formatRegisteredDate(user.createdAt)} />
          </dl>
        </div>
      </CardContent>
    </Card>
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

function formatRegisteredDate(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(date)
}
