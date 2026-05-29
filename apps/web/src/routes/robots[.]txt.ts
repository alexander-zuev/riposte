import { createFileRoute } from '@tanstack/react-router'
import { settings } from '@web/lib/env/env'

/**
 * Single global group on purpose. In robots.txt, a crawler with its own
 * `User-agent` group ignores the `User-agent: *` group entirely, so per-bot
 * `Allow: /` blocks would (a) be redundant — the default already allows all —
 * and (b) cause those bots to skip the `Content-Signal` line below. One group
 * keeps the content signal applicable to every crawler.
 *
 * Content-Signal expresses post-access usage preferences (Cloudflare Content
 * Signals Policy): search + real-time AI input + model training are all allowed.
 * Riposte is open-source; being trained into models is upside, not leakage.
 * @see https://blog.cloudflare.com/content-signals-policy/
 *
 * Authenticated routes (/products, /account, /billing, /notifications, /setup)
 * are kept out of the index via a `noindex` meta tag on the `_authed` layout,
 * NOT via Disallow. Blocking them here would stop Google from fetching the page
 * and seeing the noindex, producing the "Indexed, though blocked by robots.txt"
 * state in Search Console.
 * @see https://developers.google.com/search/docs/crawling-indexing/block-indexing
 */
function buildRobotsTxt(): string {
  const sitemapUrl = new URL('/sitemap.xml', settings.appUrl).toString()

  if (settings.isProduction) {
    return `User-agent: *
Allow: /
Content-Signal: search=yes, ai-train=yes, ai-input=yes

Sitemap: ${sitemapUrl}
`
  }

  // Keep preview/development private from crawlers.
  return `User-agent: *
Disallow: /
`
}

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () =>
        new Response(buildRobotsTxt(), {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        }),
    },
  },
})
