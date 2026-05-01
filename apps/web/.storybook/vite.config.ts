import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

function mockServerModules(): Plugin {
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
    '#tanstack-router-entry': 'export default {};',
    '#tanstack-start-entry': 'export default {};',
    'tanstack-start-manifest:v': 'export const tsrStartManifest = () => ({ routes: {} });',
    'tanstack-start-injected-head-scripts:v': 'export const injectedHeadScripts = "";',
    '@tanstack/react-start': `
      export function createServerFn(options) {
        const builder = {
          middleware: () => builder,
          inputValidator: () => builder,
          handler: (fn) => async (input) => {
            console.log("[Mock] Server function called", input);
            try {
              return await fn({
                data: input?.data,
                context: {
                  user: { id: "mock-user", email: "mock@example.com" },
                  session: { id: "mock-session" }
                }
              });
            } catch (e) {
              console.error("[Mock] Server function error", e);
              throw e;
            }
          },
        };
        return builder;
      }

      export function createMiddleware(options) {
        const builder = {
          middleware: () => builder,
          server: (fn) => ({}),
          client: (fn) => ({}),
          validator: (fn) => builder
        };
        return builder;
      }

      export function createStart() { return {}; }
      export function createClientOnlyFn() { return () => {}; }
      export function createServerOnlyFn() { return () => {}; }
      export const registerGlobalMiddleware = () => {};
    `,
    '@tanstack/react-start/server': `
      export const getCookie = () => undefined;
      export const setCookie = () => {};
      export const getRequestHeaders = () => ({});
      export const parseCookies = () => ({});
      export const setResponseHeaders = () => {};
      export const setResponseStatus = () => {};
    `,
  }
  return {
    name: 'mock-server-modules',
    enforce: 'pre',
    resolveId(id) {
      if (id in mocks) return `\0mock:${id}`
    },
    load(id) {
      if (id.startsWith('\0mock:')) return mocks[id.slice(6)]
    },
  }
}

const TANSTACK_START_VIRTUAL_MODULES = [
  '#tanstack-router-entry',
  '#tanstack-start-entry',
  'tanstack-start-manifest:v',
  'tanstack-start-injected-head-scripts:v',
]

export default defineConfig({
  plugins: [
    mockServerModules(),
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
    exclude: ['@tanstack/start-server-core', '@tanstack/react-start'],
  },
  build: {
    rollupOptions: {
      external: TANSTACK_START_VIRTUAL_MODULES,
    },
  },
})
