import { authClient } from '@web/lib/clients/auth.client'

import { AuthUser } from '../entities/auth-user'

type UseAuthReturn = {
  isLoading: boolean
  isAuthenticated: boolean
} & ({ user: AuthUser; error: null } | { user: null; error: Error } | { user: null; error: null })

export function useAuth(): UseAuthReturn {
  const session = authClient.useSession()

  const isLoading = session?.isPending ?? false
  const error = session?.error ?? null
  const userData = session?.data?.user

  if (error) {
    return { user: null, error, isLoading, isAuthenticated: false }
  }

  if (userData) {
    return { user: new AuthUser(userData), error: null, isLoading, isAuthenticated: true }
  }

  return { user: null, error: null, isLoading, isAuthenticated: false }
}
