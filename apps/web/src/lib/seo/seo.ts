import type { FileRoutesByTo } from '@web/lib/router/routeTree.gen'

/**
 * A registered route path, used to keep canonical/SEO URLs from pointing at a
 * route that doesn't exist (renaming or removing a route breaks the build).
 *
 * This is the static-route form. All current SEO heads use static paths; if we
 * later set indexable heads on dynamic routes (e.g. `/blog/$slug`) with concrete
 * slugs, reintroduce a `$param` -> `${string}` resolver so those literals match.
 */
export type RoutePath = keyof FileRoutesByTo

export const CANONICAL_ORIGIN = 'https://riposte.sh'
export const SITE_NAME = 'Riposte'
export const DEFAULT_TITLE = 'Riposte — Fight and Win Stripe Disputes on Autopilot'
export const DEFAULT_DESCRIPTION =
  'Turns your app data — sessions, logins, usage history — into chargeback evidence 10x stronger than Stripe alone. Webhook in, evidence out. Open-source.'
export const DEFAULT_OG_IMAGE = `${CANONICAL_ORIGIN}/og-image.png`
export const DEFAULT_OG_IMAGE_ALT =
  'Riposte: open-source AI agent that fights your Stripe disputes on autopilot'
export const THEME_COLOR = '#0C0A09'

interface SeoHeadInput {
  title: string
  description: string
  path: RoutePath
  ogType?: 'website' | 'article'
  ogImage?: string
  noIndex?: boolean
  links?: Array<Record<string, string>>
  /**
   * Whether to emit `<link rel="canonical">`. Defaults to true. `defaultHead`
   * sets this false so the canonical is emitted exactly once, by the leaf route:
   * TanStack concatenates head links (no dedupe), so a site-wide default canonical
   * plus a per-route canonical would ship two conflicting tags on every page.
   */
  includeCanonical?: boolean
}

export function createSeoHead(input: SeoHeadInput) {
  const canonicalUrl =
    input.path === '/' ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${input.path}`
  const image = input.ogImage ?? DEFAULT_OG_IMAGE

  const meta: Record<string, string>[] = [
    { title: input.title },
    { name: 'description', content: input.description },
    { property: 'og:title', content: input.title },
    { property: 'og:description', content: input.description },
    { property: 'og:type', content: input.ogType ?? 'website' },
    { property: 'og:url', content: canonicalUrl },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:image', content: image },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: input.title },
    { name: 'twitter:description', content: input.description },
    { name: 'twitter:image', content: image },
    { name: 'twitter:image:alt', content: DEFAULT_OG_IMAGE_ALT },
    { name: 'theme-color', content: THEME_COLOR },
  ]

  if (input.noIndex) {
    meta.push({ name: 'robots', content: 'noindex, nofollow' })
  }

  const links: Array<Record<string, string>> = []
  if (input.includeCanonical !== false) {
    links.push({ rel: 'canonical', href: canonicalUrl })
  }
  if (input.links) {
    links.push(...input.links)
  }

  return { meta, links }
}

const FAVICON_LINKS = [
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/manifest.json' },
]

const PRECONNECT_LINKS = [
  { rel: 'preconnect', href: 'https://assets.calendly.com' },
  { rel: 'dns-prefetch', href: 'https://assets.calendly.com' },
  { rel: 'preconnect', href: 'https://calendly.com' },
  { rel: 'dns-prefetch', href: 'https://calendly.com' },
]

export function defaultHead() {
  const seo = createSeoHead({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
    includeCanonical: false,
  })

  return {
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ...seo.meta,
    ],
    links: [...PRECONNECT_LINKS, ...FAVICON_LINKS, ...seo.links],
  }
}

/** A `<script type="application/ld+json">` entry in the document head. */
type JsonLdScript = { type: 'application/ld+json'; children: string }

function jsonLd(schema: Record<string, unknown>): JsonLdScript {
  return { type: 'application/ld+json', children: JSON.stringify(schema) }
}

const ORGANIZATION_ID = `${CANONICAL_ORIGIN}/#organization`
const WEBSITE_ID = `${CANONICAL_ORIGIN}/#website`

/**
 * Structured data for the landing page: Organization + WebSite + SoftwareApplication.
 *
 * The SoftwareApplication is for entity understanding (it tells Google/AI engines what
 * Riposte is and how it relates to the Organization). It is NOT yet rich-result eligible:
 * Google requires `offers.price` plus `aggregateRating` or `review` for the app rich result.
 * Add those once pricing is public and real reviews exist.
 * @see https://developers.google.com/search/docs/appearance/structured-data/software-app
 */
export function createLandingJsonLd(): JsonLdScript[] {
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: `${CANONICAL_ORIGIN}/`,
    logo: `${CANONICAL_ORIGIN}/favicon.svg`,
  }

  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: `${CANONICAL_ORIGIN}/`,
    description: DEFAULT_DESCRIPTION,
    publisher: { '@id': ORGANIZATION_ID },
  }

  const softwareApplication = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: `${CANONICAL_ORIGIN}/`,
    description: DEFAULT_DESCRIPTION,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
    publisher: { '@id': ORGANIZATION_ID },
  }

  return [jsonLd(organization), jsonLd(website), jsonLd(softwareApplication)]
}
