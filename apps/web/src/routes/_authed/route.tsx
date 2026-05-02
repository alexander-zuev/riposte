import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { ensureSession } from '@web/server/entrypoints/functions/auth.fn'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    try {
      const session = await ensureSession()
      return { user: session.user }
    } catch {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
  },
  head: () => ({
    meta: [{ name: 'robots', content: 'noindex' }],
  }),
  component: () => <Outlet />,
})
