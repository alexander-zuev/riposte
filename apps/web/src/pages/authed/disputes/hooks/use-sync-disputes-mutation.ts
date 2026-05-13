import { useMutation } from '@tanstack/react-query'

export function useSyncDisputesMutation() {
  return useMutation({
    mutationFn: async () => ({ scheduled: true }),
  })
}
