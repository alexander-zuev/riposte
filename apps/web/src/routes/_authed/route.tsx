import { fromRpc } from '@riposte/core/client'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthedLayout } from '@web/pages/authed/layouts/authed-layout'
import { ensureSession } from '@web/server/entrypoints/functions/auth.fn'

function isAuthenticationError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    '_tag' in error &&
    error._tag === 'AuthenticationError'
  )
}

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    const wire = await ensureSession()
    const result = fromRpc(wire)

    if (result.isErr()) {
      if (isAuthenticationError(result.error)) {
        throw redirect({
          to: '/sign-in',
          search: { redirectTo: location.href },
        })
      }

      throw result.error
    }

    return { session: result.value }
  },
  component: AuthedLayout,
})
