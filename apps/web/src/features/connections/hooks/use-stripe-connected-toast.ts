import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'

type Params = {
  /** Search param value from the page's typed `useSearch`. */
  stripeConnected: boolean | undefined
}

/**
 * Reacts to the `?stripeConnected=true` URL signal set by the OAuth callback.
 * Fires the success toast, invalidates the queries Stripe-connect affects
 * (product setup progression + connection status), and strips the param via
 * replace navigation so a refresh doesn't replay the toast.
 *
 * Caller owns the `useSearch({ from })` lookup so search-param typing stays
 * pinned to the route the hook is mounted on.
 */
export function useStripeConnectedToast({ stripeConnected }: Params) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!stripeConnected) return

    toast.success('Stripe connected')
    queryClient.invalidateQueries({ queryKey: ['products', 'setup'] })
    queryClient.invalidateQueries({ queryKey: ['connections', 'status'] })
    navigate({
      to: '.',
      search: (prev) => ({ ...prev, stripeConnected: undefined }),
      replace: true,
    })
  }, [stripeConnected, queryClient, navigate])
}
