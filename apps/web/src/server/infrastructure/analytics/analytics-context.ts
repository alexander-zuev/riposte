import type { UserId } from '@riposte/core'

export const POSTHOG_SESSION_ID_HEADER = 'x-posthog-session-id'

export type AnalyticsContext = {
  distinctId?: UserId
  posthogSessionId?: string
}

export function createAnalyticsContext(input: {
  distinctId?: UserId
  posthogSessionId?: string | null
}): AnalyticsContext {
  const posthogSessionId = input.posthogSessionId?.trim()
  return {
    ...(input.distinctId ? { distinctId: input.distinctId } : {}),
    ...(posthogSessionId ? { posthogSessionId } : {}),
  }
}
