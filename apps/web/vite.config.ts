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
  const isDevServe = process.env.CLOUDFLARE_ENV === 'dev'
  const isAnalyzeBuild = process.env.BUNDLE_ANALYZE_BUILD === '1'
  const isCI = !!process.env.CI

  return {
    plugins: [
      cloudflare({
        viteEnvironment: { name: 'ssr' },
        // Tunnel is a dev-only feature (exposes localhost for OAuth callbacks) and
        // only `pnpm dev` sets CLOUDFLARE_ENV=dev. Gating on the env var rather than
        // Vite's `command` is deliberate: prerender boots an internal `vite preview`
        // (command === 'serve'), and the named `riposte-dev` tunnel has no route for
        // its random port, which would fail the build.
        tunnel: isDevServe ? { name: 'riposte-dev', autoStart: true } : false,
        // Remote bindings default to on, which makes the build-time prerender preview
        // open a live remote-proxy session for any `remote: true` binding (AI here) and
        // crawl pages over it (flaky -> ECONNRESET). Prerender for static marketing
        // pages should use LOCAL bindings, so enable remote bindings only in dev serve.
        // https://developers.cloudflare.com/changelog/post/2025-12-19-tanstack-start-prerendering/
        remoteBindings: isDevServe,
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
