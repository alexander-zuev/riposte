import { resolve } from 'node:path'

import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const startStub = resolve(import.meta.dirname, 'test/mocks/tanstack-start-entry.ts')

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
          include: [
            'better-auth',
            '@better-auth/stripe',
            'stripe',
            'posthog-node',
            'drizzle-orm',
            'zod',
          ],
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
    ],
  },
})
