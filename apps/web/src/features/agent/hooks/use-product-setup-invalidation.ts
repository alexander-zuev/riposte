import { useQueryClient } from '@tanstack/react-query'
import { productQueries } from '@web/entities/products/product-queries'
import { useCallback, useRef } from 'react'

type SetupChangeState = {
  setupChangeId?: string | null
}

export function useProductSetupInvalidation(productId: string) {
  const queryClient = useQueryClient()
  const setupChangeIdRef = useRef<string | null | undefined>(undefined)

  return useCallback(
    (state: SetupChangeState, source: 'server' | 'client') => {
      if (source !== 'server') return

      const setupChangeId = state.setupChangeId ?? null
      if (setupChangeIdRef.current === undefined) {
        setupChangeIdRef.current = setupChangeId
        return
      }

      if (setupChangeIdRef.current === setupChangeId) return
      setupChangeIdRef.current = setupChangeId
      queryClient.invalidateQueries({
        queryKey: productQueries.setup(productId).queryKey,
      })
    },
    [productId, queryClient],
  )
}
