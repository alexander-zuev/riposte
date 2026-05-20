import { unwrapRpc } from '@riposte/core/client'
import { useMutation } from '@tanstack/react-query'
import { getStripeOAuthUrl } from '@web/server/entrypoints/functions/stripe.fn'
import { toast } from 'sonner'

export function useStripeOAuthMutation() {
  return useMutation({
    mutationFn: async () => unwrapRpc(await getStripeOAuthUrl()),
    onMutate: () => {
      toast.loading('Redirecting to Stripe', { duration: Infinity, id: 'stripe-oauth' })
    },
    onSuccess: ({ url }) => {
      window.location.assign(url)
    },
    onError: (error) => {
      toast.dismiss('stripe-oauth')
      toast.error(error instanceof Error ? error.message : 'Failed to start Stripe connection')
    },
  })
}
