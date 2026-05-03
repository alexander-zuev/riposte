/// <reference types="vite/client" />
import * as Sentry from '@sentry/tanstackstart-react'
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { ThemeProvider } from '@web/lib/hooks/use-theme'
import { AnalyticsProvider } from '@web/lib/providers/posthog-provider'
import { defaultHead } from '@web/lib/seo/seo'
import { getThemeServerFn } from '@web/server/entrypoints/functions/theme.fn' // clears stale dark cookies
import { Toaster } from '@web/ui/components/ui/sonner'
import { TooltipProvider } from '@web/ui/components/ui/tooltip'
import { useEffect } from 'react'

import globalStyles from '@web/ui/stylesheets/globals.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => defaultHead(globalStyles),
  loader: async () => getThemeServerFn(),
  staleTime: Infinity, // Cache theme forever - only refetch when explicitly invalidated
  errorComponent: ({ error, reset }) => {
    useEffect(() => {
      Sentry.captureException(error)
    }, [error])

    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <h1>Something went wrong</h1>
          <button onClick={reset} className="mt-4 underline">
            Try again
          </button>
        </div>
      </div>
    )
  },
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1>404 — Not found</h1>
      </div>
    </div>
  ),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AnalyticsProvider>
          <ThemeProvider>
            <Toaster />
            <TooltipProvider>{children}</TooltipProvider>
          </ThemeProvider>
        </AnalyticsProvider>
        <Scripts />
      </body>
    </html>
  )
}
