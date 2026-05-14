import { EnvelopeSimpleIcon, FilePdfIcon, FlaskIcon, HouseIcon } from '@phosphor-icons/react'
import { fromRpc } from '@riposte/core/client'
import { assertDevRouteAccess } from '@server/entrypoints/functions/dev.fn'
import { createFileRoute, Link, notFound, Outlet } from '@tanstack/react-router'
import { PageShell } from '@web/ui/components/layout/page/page-shell'
import { Button } from '@web/ui/components/ui/button'

const DEV_NAV_ITEMS = [
  {
    to: '/dev',
    label: 'Dev home',
    description: 'Navigation for local-only tools',
    icon: HouseIcon,
  },
  {
    to: '/dev/evidence-packets',
    label: 'Evidence PDFs',
    description: 'Preview generated dispute evidence packets',
    icon: FilePdfIcon,
  },
  {
    to: '/dev/emails',
    label: 'Email templates',
    description: 'Preview and send development email templates',
    icon: EnvelopeSimpleIcon,
  },
] as const

export const Route = createFileRoute('/dev')({
  beforeLoad: async () => {
    const result = fromRpc(await assertDevRouteAccess())
    if (result.isErr()) throw notFound()
  },
  component: DevLayout,
})

function DevLayout() {
  return (
    <PageShell
      width="wide"
      mainClassName="grid content-start gap-6 px-6 py-6 text-foreground md:px-8"
      header={null}
    >
      <header className="grid gap-4 border-b border-border pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
            <p className="m-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Dev tools
            </p>
            <h1 className="m-0">Riposte development</h1>
          </div>
          <Button render={<Link to="/dashboard" />} variant="secondary">
            Back to app
          </Button>
        </div>

        <nav aria-label="Development tools" className="flex flex-wrap gap-2">
          {DEV_NAV_ITEMS.map((item) => {
            const Icon = item.icon

            return (
              <Button
                key={item.to}
                render={<Link to={item.to} activeProps={{ 'data-active': true }} />}
                variant="secondary"
                size="sm"
                className="data-[active=true]:bg-muted"
              >
                <Icon data-icon="inline-start" />
                {item.label}
              </Button>
            )
          })}
        </nav>
      </header>

      <Outlet />
    </PageShell>
  )
}

export { DEV_NAV_ITEMS }
