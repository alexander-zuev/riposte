import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

const startStub = resolve(import.meta.dirname, 'test/mocks/tanstack-start-entry.ts')
const systemChromePath = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].find((path) => path && existsSync(path))

const cloudflareTestPlugin = cloudflareTest({
  miniflare: {
    compatibilityFlags: ['nodejs_compat', 'service_binding_extra_handlers'],
    compatibilityDate: '2026-04-21',
  },
  wrangler: {
    configPath: './wrangler.jsonc',
    environment: 'test',
  },
})

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      '#tanstack-router-entry': startStub,
      '#tanstack-start-entry': startStub,
      '#tanstack-start-plugin-adapters': startStub,
      'tanstack-start-manifest:v': startStub,
      'tanstack-start-injected-head-scripts:v': startStub,
    },
  },
  test: {
    globals: true,
    reporters: ['dot'],
    deps: {
      optimizer: {
        ssr: {
          enabled: true,
          include: ['better-auth', '@better-auth/stripe', 'stripe', 'drizzle-orm', 'zod'],
        },
      },
    },
    typecheck: {
      tsconfig: './test/tsconfig.json',
    },
    projects: [
      {
        extends: true,
        plugins: [cloudflareTestPlugin],
        test: {
          name: 'unit',
          dir: 'test/unit',
          include: ['**/*.test.ts'],
          setupFiles: ['test/unit/setup.ts'],
          isolate: false,
        },
      },
      {
        extends: true,
        test: {
          name: 'node-unit',
          dir: 'test/node-unit',
          include: ['**/*.test.ts'],
        },
      },
      {
        extends: true,
        plugins: [cloudflareTestPlugin],
        test: {
          name: 'integration',
          dir: 'test/integration',
          include: ['**/*.test.ts'],
          globalSetup: ['test/integration/global-setup.ts'],
          setupFiles: ['test/integration/setup.ts'],
          isolate: false,
        },
      },
      {
        extends: true,
        test: {
          name: 'browser-e2e',
          dir: 'test/browser-e2e',
          include: ['**/*.test.ts'],
          browser: {
            enabled: true,
            provider: playwright({
              launchOptions: systemChromePath ? { executablePath: systemChromePath } : undefined,
            }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
