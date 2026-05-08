/// <reference types="vite/client" />

import {
  ArrowClockwiseIcon,
  HouseIcon,
  QuestionIcon,
  WarningOctagonIcon,
} from '@phosphor-icons/react'
import * as Sentry from '@sentry/tanstackstart-react'
import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { useIdentifyUser } from '@web/lib/analytics'
import { ThemeProvider } from '@web/lib/hooks/use-theme'
import { AnalyticsProvider } from '@web/lib/providers/posthog-provider'
import { defaultHead } from '@web/lib/seo/seo'
import { getThemeServerFn } from '@web/server/entrypoints/functions/theme.fn'
import { FullPageStatus } from '@web/ui/components/layout/full-page-status'
import { Button } from '@web/ui/components/ui/button'
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
      <FullPageStatus
        icon={WarningOctagonIcon}
        tone="destructive"
        role="alert"
        title="Something went wrong"
        subtitle="The page could not finish loading"
        actions={
          <Button type="button" onClick={reset}>
            <ArrowClockwiseIcon data-icon="inline-start" />
            Try again
          </Button>
        }
      />
    )
  },
  notFoundComponent: () => (
    <FullPageStatus
      icon={QuestionIcon}
      title="Page not found"
      subtitle="This page does not exist or has moved"
      actions={
        <Button render={<Link to="/" />} className="no-underline hover:no-underline">
          <HouseIcon data-icon="inline-start" />
          Go home
        </Button>
      }
    />
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

function AnalyticsIdentifier() {
  useIdentifyUser()
  return null
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <AnalyticsProvider>
          <AnalyticsIdentifier />
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
