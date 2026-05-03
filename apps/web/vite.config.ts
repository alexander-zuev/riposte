import { cloudflare } from '@cloudflare/vite-plugin'
import babel from '@rolldown/plugin-babel'
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(() => {
  const hasSentrySourcemapAuthToken =
    typeof process.env.SENTRY_AUTH_TOKEN === 'string' && process.env.SENTRY_AUTH_TOKEN.length > 0

  return {
    plugins: [
      cloudflare({
        viteEnvironment: { name: 'ssr' },
      }),
      ...tanstackStart({
        router: {
          entry: './lib/router/router.tsx',
          generatedRouteTree: './lib/router/routeTree.gen.ts',
        },
        importProtection: { enabled: true },
      }),
      react(),
      babel({ presets: [reactCompilerPreset({ target: '19' })] }),
      tailwindcss(),
      sentryTanstackStart({
        org: 'azcompany',
        project: 'riposte',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: {
          filesToDeleteAfterUpload: ['./dist/client/**/*.map'],
        },
      }),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    build: {
      ...(hasSentrySourcemapAuthToken && { sourcemap: true }),
      chunkSizeWarningLimit: 1000,
      target: 'esnext',
    },
    environments: {
      client: {
        build: {
          rolldownOptions: {
            output: {
              manualChunks(id) {
                if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
                  return 'vendor-react'
                }
                if (
                  id.includes('node_modules/@sentry') ||
                  id.includes('node_modules/@sentry-internal') ||
                  id.includes('node_modules/posthog-js')
                ) {
                  return 'vendor-observability'
                }
                if (id.includes('node_modules/@phosphor-icons')) {
                  return 'vendor-icons'
                }
              },
            },
          },
        },
      },
    },
    server: {
      host: 'localhost',
      port: 3000,
      open: false,
      allowedHosts: ['tunnel.riposte.sh'],
    },
  }
})
