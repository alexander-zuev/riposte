import { PageShell } from '@web/ui/components/layout/page/page-shell'

import { CtaSection } from './components/cta-section'
import { Footer } from './components/footer'
import { HeroSection } from './components/hero-section'
import { ScrollStage } from './components/scroll-show/scroll-stage'
import { TrustSection } from './components/trust-section'

export function LandingPage() {
  return (
    <PageShell width="none" frame="none">
      <HeroSection />
      <ScrollStage />
      <TrustSection />
      <CtaSection />
      <Footer />
    </PageShell>
  )
}
