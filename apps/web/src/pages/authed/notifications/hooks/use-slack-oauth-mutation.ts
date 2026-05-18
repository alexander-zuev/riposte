import { unwrapRpc } from '@riposte/core/client'
import { useMutation } from '@tanstack/react-query'
import { getSlackOAuthUrl } from '@web/server/entrypoints/functions/slack.fn'
import { toast } from 'sonner'

export function useSlackOAuthMutation() {
  return useMutation({
    mutationFn: async () => unwrapRpc(await getSlackOAuthUrl()),
    onMutate: () => {
      toast.loading('Redirecting to Slack', { duration: Infinity, id: 'slack-oauth' })
    },
    onSuccess: ({ url }) => {
      window.location.assign(url)
    },
    onError: (error) => {
      toast.dismiss('slack-oauth')
      toast.error(error instanceof Error ? error.message : 'Failed to start Slack connection')
    },
  })
}
