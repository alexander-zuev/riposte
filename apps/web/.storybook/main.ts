import type { StorybookConfig } from '@storybook/react-vite'
import { tanstackStartPlugin } from 'storybook-addon-tanstack-start/plugin'
import { mergeConfig } from 'vite'

const config: StorybookConfig = {
  stories: ['./**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: ['@storybook/addon-themes'],
  staticDirs: ['../public', './public'],
  framework: {
    name: '@storybook/react-vite',
    options: {
      builder: {
        viteConfigPath: '.storybook/vite.config.ts',
      },
    },
  },
  core: {
    disableTelemetry: true,
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [
        tanstackStartPlugin({
          additionalServerModules: ['@tanstack/react-start/server'],
        }),
      ],
    })
  },
}

export default config
