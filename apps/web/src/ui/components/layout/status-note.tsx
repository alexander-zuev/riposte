import { Card, CardContent } from '@web/ui/components/ui/card'
import type { ReactNode } from 'react'

/**
 * Centered in-section status (loading, empty, error). Pass the icon as a rendered node so the
 * caller controls its size — e.g. `<GridLoader />` for loading (it sizes itself), or a sized
 * Phosphor icon for empty/error. Whole-screen states use `FullPageStatus` instead.
 */
export function StatusNote({
  icon,
  children,
  action,
}: {
  icon: ReactNode
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        {icon}
        <small>{children}</small>
        {action ? <div className="mt-2">{action}</div> : null}
      </CardContent>
    </Card>
  )
}
