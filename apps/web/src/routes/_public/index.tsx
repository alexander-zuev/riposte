import { createFileRoute } from '@tanstack/react-router'
import {
  createLandingJsonLd,
  createSeoHead,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
} from '@web/lib/seo/seo'
import { LandingPage } from '@web/pages/public/landing/landing-page'

export const Route = createFileRoute('/_public/')({
  // `defaultHead` no longer emits the canonical (it would duplicate per-route
  // ones), so the landing route sets its own canonical here, plus the landing
  // structured data (Organization + WebSite + SoftwareApplication) so Google/AI
  // engines can resolve the Riposte entity.
  head: () => ({
    ...createSeoHead({ title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: '/' }),
    scripts: createLandingJsonLd(),
  }),
  component: LandingPage,
})
