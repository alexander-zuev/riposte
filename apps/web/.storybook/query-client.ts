import { QueryClient, type QueryKey } from '@tanstack/react-query'

export const storybookQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

export function seedStorybookQuery<TData>(queryKey: QueryKey, data: TData) {
  storybookQueryClient.clear()
  storybookQueryClient.setQueryDefaults(queryKey, { staleTime: Infinity })
  storybookQueryClient.setQueryData(queryKey, data)
}
