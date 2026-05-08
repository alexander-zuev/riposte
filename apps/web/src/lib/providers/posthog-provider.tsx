import { settings } from '@web/lib/env/env'
import { PostHogProvider } from 'posthog-js/react'
import type { PropsWithChildren, ReactNode } from 'react'

const posthogOptions = {
  api_host: settings.posthog.apiHost,
  ui_host: settings.posthog.uiHost,
  external_scripts_inject_target: 'head' as const,
  disable_surveys: true,
  loaded: (ph: { register: (props: Record<string, string>) => void }) => {
    ph.register({ environment: settings.mode, source: 'web' })
  },
}

export function AnalyticsProvider({ children }: PropsWithChildren) {
  if (!settings.posthog.enabled) {
    return <>{children}</>
  }

  return (
    <PostHogProvider apiKey={settings.posthog.apiKey} options={posthogOptions}>
      {children as ReactNode}
    </PostHogProvider>
  )
}
