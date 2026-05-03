import type { FileRoutesByTo } from '@web/lib/router/routeTree.gen'

type ResolveParams<P extends string> = P extends `${infer Pre}$${infer Rest}`
  ? Rest extends `${string}/${infer Post}`
    ? `${Pre}${string}/${ResolveParams<Post>}`
    : `${Pre}${string}`
  : P

export type RoutePath = {
  [K in keyof FileRoutesByTo]: ResolveParams<K & string>
}[keyof FileRoutesByTo]

export const CANONICAL_ORIGIN = 'https://riposte.sh'
export const SITE_NAME = 'Riposte'
export const DEFAULT_TITLE = 'Riposte — Fight and Win Stripe Disputes on Autopilot'
export const DEFAULT_DESCRIPTION =
  'Turns your app data — sessions, logins, usage history — into chargeback evidence 10x stronger than Stripe alone. Webhook in, evidence out. Open-source.'
export const DEFAULT_OG_IMAGE = `${CANONICAL_ORIGIN}/og-image.png`
export const DEFAULT_OG_IMAGE_ALT = 'Riposte — AI-powered chargeback defense agent'
export const THEME_COLOR = '#0C0A09'

interface SeoHeadInput {
  title: string
  description: string
  path: RoutePath
  ogType?: 'website' | 'article'
  ogImage?: string
  noIndex?: boolean
  links?: Array<Record<string, string>>
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

  return {
    meta,
    links: [{ rel: 'canonical', href: canonicalUrl }, ...(input.links ?? [])],
  }
}

const FAVICON_LINKS = [
  { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/manifest.json' },
]

export function defaultHead(globalStylesHref: string) {
  const seo = createSeoHead({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: '/',
  })

  return {
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ...seo.meta,
    ],
    links: [...FAVICON_LINKS, { rel: 'stylesheet', href: globalStylesHref }, ...seo.links],
  }
}
