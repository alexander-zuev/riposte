import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview, ReactRenderer } from '@storybook/react-vite'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { createContext, useContext, type ReactNode } from 'react'

import '../src/ui/stylesheets/globals.css'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

const StoryContext = createContext<(() => ReactNode) | undefined>(undefined)

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
    (Story) => (
      <StoryContext.Provider value={() => <Story />}>
        <RouterProvider router={storyRouter} />
      </StoryContext.Provider>
    ),
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
}

export default preview
