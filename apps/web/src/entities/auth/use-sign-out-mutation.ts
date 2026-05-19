import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { authService } from '@web/lib/auth'
import type { AuthServiceError } from '@web/lib/auth'
import { toast } from 'sonner'

export function useSignOutMutation() {
  const router = useRouter()

  return useMutation<void, AuthServiceError>({
    mutationFn: async () => {
      const result = await authService().signOut()
      if (result.isErr()) throw result.error
    },
    onSuccess: async () => {
      await router.invalidate()
    },
    onError: (error) => {
      toast.error(error.message ?? 'Failed to log out. Please try again')
    },
  })
}
