import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview, ReactRenderer } from '@storybook/react-vite'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { createContext, useCallback, useContext, type ReactNode } from 'react'

import '../src/ui/stylesheets/globals.css'
import { storybookQueryClient } from './query-client'

const StoryContext = createContext<(() => ReactNode) | undefined>(undefined)

function StoryRouterDecorator(Story: () => ReactNode) {
  const renderStory = useCallback(() => <Story />, [Story])

  return (
    <StoryContext.Provider value={renderStory}>
      <RouterProvider router={storyRouter} />
    </StoryContext.Provider>
  )
}

function RenderStory() {
  const storyFn = useContext(StoryContext)
  if (!storyFn) throw new Error('Story context not found')
  return <>{storyFn()}</>
}

const storyPath = '/__story__'
const rootRoute = createRootRoute()
rootRoute.addChildren([
  createRoute({
    path: storyPath,
    getParentRoute: () => rootRoute,
    component: RenderStory,
  }),
])

const storyRouter = createRouter({
  history: createMemoryHistory({ initialEntries: [storyPath] }),
  routeTree: rootRoute,
})

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disable: true },
  },
  decorators: [
    withThemeByClassName<ReactRenderer>({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
    }),
    StoryRouterDecorator,
    (Story) => (
      <QueryClientProvider client={storybookQueryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
}

export default preview
