import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'

/**
 * Reacts to the `?stripeConnected=true` URL signal set by the OAuth callback.
 * Fires the success toast, defensively invalidates the setup query, and strips
 * the param so a refresh doesn't replay the toast.
 */
export function useStripeConnectedToast(productId: string) {
  const { stripeConnected } = useSearch({
    from: '/_authed/products/$productId/agent',
  })
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!stripeConnected) return

    toast.success('Stripe connected')
    queryClient.invalidateQueries({
      queryKey: ['products', 'setup', productId],
    })
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, stripeConnected: undefined }),
      replace: true,
    })
  }, [stripeConnected, productId, queryClient, navigate])
}
