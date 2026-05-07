import { createLogger } from '@riposte/core/client'
import { useAuth } from '@web/lib/auth'
import { Sentry } from '@web/lib/clients/sentry-client'
import { usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'

const logger = createLogger('analytics')

/**
 * Login-only analytics identification.
 *
 * Logout cleanup belongs in the explicit sign-out handler. Resetting when a
 * user is absent would also run for anonymous visitors and fragment anonymous
 * PostHog attribution by generating new distinct IDs unnecessarily.
 */
export function useIdentifyUser() {
  const posthog = usePostHog()
  const { user } = useAuth()
  const userId = user?.id
  const email = user?.email
  const name = user?.displayName

  useEffect(() => {
    if (!userId) return

    Sentry.setUser({ id: userId, email })

    if (!posthog) return

    const distinctId = posthog.get_distinct_id()
    if (distinctId && !distinctId.startsWith(userId)) {
      logger.debug('PostHog user changed, calling posthog.identify')
      posthog.identify(userId, { email, name })
    }
  }, [userId, email, name, posthog])
}
