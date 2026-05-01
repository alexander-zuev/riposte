/// <reference types="vite/client" />
import * as Sentry from '@sentry/tanstackstart-react'
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import { AnalyticsProvider } from '@web/lib/providers/posthog-provider'
import { CANONICAL_ORIGIN, DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME } from '@web/lib/seo/seo'
import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'

import globalStyles from '@web/ui/stylesheets/globals.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: DEFAULT_TITLE },
      { name: 'description', content: DEFAULT_DESCRIPTION },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: `${CANONICAL_ORIGIN}/` },
      { property: 'og:title', content: DEFAULT_TITLE },
      { property: 'og:description', content: DEFAULT_DESCRIPTION },
    ],
    links: [{ rel: 'stylesheet', href: globalStyles }],
  }),
  errorComponent: ({ error, reset }) => {
    useEffect(() => {
      Sentry.captureException(error)
    }, [error])

    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
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
        <h1 className="text-2xl font-bold">404 — Not found</h1>
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AnalyticsProvider>
          <ThemeProvider attribute="class" defaultTheme="light">
            {children}
          </ThemeProvider>
        </AnalyticsProvider>
        <Scripts />
      </body>
    </html>
  )
}
