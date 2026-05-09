import { createRequire } from 'node:module'
import path from 'node:path'

import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const require = createRequire(import.meta.url)
const startStubs = path.resolve(
  path.dirname(require.resolve('storybook-addon-tanstack-start/plugin')),
  'mocks/start-stubs.mjs',
)
const storybookRoot = path.resolve(__dirname)
const disputeCaseFnMock = path.resolve(storybookRoot, 'mocks/dispute-case.fn.ts')

function mockPlatformModules(): Plugin {
  const mocks: Record<string, string> = {
    'cloudflare:workers':
      'export const env = {}; export function waitUntil() {} export class DurableObject {}',
    'node:async_hooks': `
      export class AsyncLocalStorage {
        getStore() { return undefined; }
        run(store, fn) { return fn(); }
      }
      export default { AsyncLocalStorage };
    `,
    'node:crypto': `
      export const createHash = () => ({
        update: () => ({ digest: () => 'mock-hash' }),
      });
      export const randomUUID = () => globalThis.crypto.randomUUID();
      export const createPrivateKey = () => ({});
      export const sign = () => new Uint8Array();
      export default { createHash, randomUUID, createPrivateKey, sign };
    `,
  }
  return {
    name: 'mock-platform-modules',
    enforce: 'pre',
    resolveId(id) {
      if (id in mocks) return `\0mock:${id}`
    },
    load(id) {
      if (id.startsWith('\0mock:')) return mocks[id.slice(6)]
    },
  }
}

export default defineConfig({
  plugins: [
    mockPlatformModules(),
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset({ target: '19' })] }) as unknown as Plugin,
  ],
  define: {
    'import.meta.env.VITE_APP_URL': JSON.stringify('http://localhost:6006'),
    'import.meta.env.VITE_SENTRY_DSN': JSON.stringify('https://mock@sentry.io/mock'),
    'import.meta.env.VITE_PUBLIC_POSTHOG_KEY': JSON.stringify('mock_posthog_key'),
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@tanstack/react-start/server': startStubs,
      '@storybook-local': storybookRoot,
      '@web/server/entrypoints/functions/dispute-case.fn': disputeCaseFnMock,
    },
  },
  optimizeDeps: {
    include: ['@tanstack/react-router'],
  },
})
