import { StartClient } from '@tanstack/react-start/client'
import { ErrorBoundary, initializeSentry } from '@web/lib/clients/sentry.client'
import { getRouter } from '@web/lib/router/router'
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
        <div className="flex min-h-screen items-center justify-center p-8">
          <div className="text-center">
            <h1>Something went wrong</h1>
            <button onClick={() => window.location.reload()} className="mt-4 underline">
              Try again
            </button>
          </div>
        </div>
      }
    >
      <StartClient />
    </ErrorBoundary>
  </StrictMode>,
)
