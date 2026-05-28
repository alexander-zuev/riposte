import { withThemeByClassName } from '@storybook/addon-themes'
import type { Preview, ReactRenderer } from '@storybook/tanstack-react'
import { QueryClientProvider } from '@tanstack/react-query'

import '../src/ui/stylesheets/globals.css'
import { storybookQueryClient } from './query-client'

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
      <QueryClientProvider client={storybookQueryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
}

export default preview
