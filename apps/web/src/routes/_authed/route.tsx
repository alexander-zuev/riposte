import { fromRpc } from '@riposte/core/client'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { isTaggedErrorWithTag } from '@web/lib/errors'
import { AuthedLayout } from '@web/pages/authed/layouts/authed-layout'
import { ensureSession } from '@web/server/entrypoints/functions/auth.fn'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    const result = fromRpc(await ensureSession())

    if (result.isErr()) {
      if (isTaggedErrorWithTag(result.error, 'AuthenticationError')) {
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
