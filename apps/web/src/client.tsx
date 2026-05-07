import { ArrowClockwiseIcon, WarningOctagonIcon } from '@phosphor-icons/react'
import { StartClient } from '@tanstack/react-start/client'
import { ErrorBoundary, initializeSentry } from '@web/lib/clients/sentry-client'
import { getRouter } from '@web/lib/router/router'
import { FullPageStatus } from '@web/ui/components/layout/full-page-status'
import { Button } from '@web/ui/components/ui/button'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'

const router = getRouter()
initializeSentry(router)

try {
  sessionStorage.removeItem('chunk-reload')
} catch {
  // Storage blocked
}
window.addEventListener('vite:preloadError', () => {
  try {
    if (!sessionStorage.getItem('chunk-reload')) {
      sessionStorage.setItem('chunk-reload', '1')
      window.location.reload()
    }
  } catch {
    window.location.reload()
  }
})

hydrateRoot(
  document,
  <StrictMode>
    <ErrorBoundary
      fallback={
        <FullPageStatus
          icon={WarningOctagonIcon}
          tone="destructive"
          role="alert"
          title="Something went wrong"
          subtitle="The app hit an unrecoverable error"
          actions={
            <Button type="button" onClick={() => window.location.reload()}>
              <ArrowClockwiseIcon data-icon="inline-start" />
              Reload
            </Button>
          }
        />
      }
    >
      <StartClient />
    </ErrorBoundary>
  </StrictMode>,
)
