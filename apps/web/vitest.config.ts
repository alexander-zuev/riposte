import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

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
          isolate: false,
        },
      },
    ],
  },
})
