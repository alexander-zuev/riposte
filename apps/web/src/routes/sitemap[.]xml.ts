import { createFileRoute } from '@tanstack/react-router'
import { settings } from '@web/lib/env/env'
import { CANONICAL_ORIGIN, type RoutePath } from '@web/lib/seo/seo'

/**
 * Public, indexable pages. `RoutePath` is derived from the generated route tree
 * (clean URL paths, e.g. `/privacy`), so a removed route breaks the build instead
 * of silently emitting a sitemap entry that 404s. `/sign-in` is intentionally
 * excluded (auth page, no SEO value).
 */
const STATIC_PAGES = [
  '/',
  '/privacy',
  '/terms',
  '/sub-processors',
] as const satisfies readonly RoutePath[]

function buildSitemap(): string {
  const staticEntries = STATIC_PAGES.map(
    (path) => `
  <url>
    <loc>${CANONICAL_ORIGIN}${path === '/' ? '/' : path}</loc>
  </url>`,
  )

  // FUTURE: when a content/blog layer exists, fetch + map dynamic entries here
  // (see typist `sitemap.xml.ts` for the RPC pattern), e.g.:
  //   const posts = await rpc<BlogPost[]>(getAllBlogPostsFn())
  //   const blogEntries = posts.map((p) => `... <loc>${CANONICAL_ORIGIN}/blog/${p.slug}</loc> ...`)
  // Keep this builder async-ready so adding fetches does not change the route shape.

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries.join('')}
</urlset>`
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        if (!settings.isProduction) {
          return new Response('', { status: 404 })
        }

        return new Response(buildSitemap(), {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          },
        })
      },
    },
  },
})
