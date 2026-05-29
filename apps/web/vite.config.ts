import { cloudflare } from '@cloudflare/vite-plugin'
import babel from '@rolldown/plugin-babel'
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Public marketing/legal pages prerendered to static HTML at build time (no
 * per-request Worker execution). Auth pages stay SSR (need a real session) and
 * `/sign-in` is excluded (no SEO value). When dynamic content (blog, compare,
 * use-cases) lands, extend this set or switch to a prefix/crawlLinks filter.
 */
const PRERENDER_EXACT = new Set(['/', '/privacy', '/terms', '/sub-processors'])

export default defineConfig(() => {
  const hasSentrySourcemapAuthToken =
    typeof process.env.SENTRY_AUTH_TOKEN === 'string' && process.env.SENTRY_AUTH_TOKEN.length > 0
  const isTest = process.env.CLOUDFLARE_ENV === 'test'
  const isAnalyzeBuild = process.env.BUNDLE_ANALYZE_BUILD === '1'
  const isCI = !!process.env.CI

  return {
    plugins: [
      cloudflare({
        viteEnvironment: { name: 'ssr' },
        tunnel: isTest ? false : { name: 'riposte-dev', autoStart: true },
      }),
      ...tanstackStart({
        router: {
          entry: './lib/router/router.tsx',
          generatedRouteTree: './lib/router/routeTree.gen.ts',
        },
        importProtection: { enabled: true },
        server: {
          build: {
            inlineCss: true,
          },
        },
        // Prerender static public pages at build time. Disabled in CI and bundle
        // analysis builds (no dev server / not worth the time there).
        prerender: {
          enabled: !isAnalyzeBuild && !isCI,
          filter: ({ path }) => PRERENDER_EXACT.has(path),
        },
      }),
      react(),
      babel({ presets: [reactCompilerPreset({ target: '19' })] }),
      tailwindcss(),
      ...(hasSentrySourcemapAuthToken
        ? [
            sentryTanstackStart({
              org: 'azcompany',
              project: 'riposte',
              authToken: process.env.SENTRY_AUTH_TOKEN,
              sourcemaps: {
                filesToDeleteAfterUpload: ['./dist/client/**/*.map'],
              },
            }),
          ]
        : []),
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
      cors: {
        origin: '*',
      },
    },
  }
})
