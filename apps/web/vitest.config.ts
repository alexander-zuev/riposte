import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    cloudflareTest({
      miniflare: {
        compatibilityFlags: ['nodejs_compat', 'service_binding_extra_handlers'],
        compatibilityDate: '2026-04-21',
      },
      wrangler: {
        configPath: './wrangler.jsonc',
        environment: 'test',
      },
    }),
  ],
  test: {
    globals: true,
    teardownTimeout: 500,
    reporters: ['dot'],
    typecheck: {
      tsconfig: './test/tsconfig.json',
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          dir: 'test/unit',
          include: ['**/*.test.ts'],
        },
      },
    ],
  },
})
