import { AuthenticationError, fromRpc } from '@riposte/core/client'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthedLayout } from '@web/pages/authed/layouts/authed-layout'
import { ensureSession } from '@web/server/entrypoints/functions/auth.fn'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const wire = await ensureSession()
    const result = fromRpc(wire)

    if (result.isErr()) {
      if (AuthenticationError.is(result.error)) {
        throw redirect({ to: '/sign-in' })
      }

      throw result.error
    }

    return { session: result.value }
  },
  component: AuthedLayout,
})
