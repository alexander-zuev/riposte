import { unwrapRpc } from '@riposte/core/client'
import { useMutation } from '@tanstack/react-query'
import { getStripeOAuthUrl } from '@web/server/entrypoints/functions/stripe.fn'
import { toast } from 'sonner'

type Input = {
  productId: string
  redirectAfter?: string
}

export function useStripeOAuthMutation() {
  return useMutation<{ url: string }, Error, Input>({
    mutationFn: async (input) => unwrapRpc(await getStripeOAuthUrl({ data: input })),
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
