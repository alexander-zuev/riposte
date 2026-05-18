import { unwrapRpc } from '@riposte/core/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { connectionsQueries } from '@web/entities/connections'
import { setNotificationChannelPreference } from '@web/server/entrypoints/functions/connection.fn'
import { toast } from 'sonner'

export type NotificationChannelToggleInput = {
  channel: 'email' | 'slack'
  enabled: boolean
}

export function useNotificationChannelToggleMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: NotificationChannelToggleInput) =>
      unwrapRpc(await setNotificationChannelPreference({ data: input })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: connectionsQueries.status().queryKey })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update notification channel')
    },
  })
}
