import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

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
  },
  optimizeDeps: {
    include: ['@tanstack/react-router', 'use-sync-external-store/shim/with-selector'],
  },
})
