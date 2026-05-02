import { PageShell } from '@web/ui/components/layout/page/page-shell'

import { CtaSection } from './components/cta-section'
import { FaqSection } from './components/faq-section'
import { FeaturesSection } from './components/features-section'
import { FounderSection } from './components/founder-section'
import { HeroSection } from './components/hero-section'
import { HowItWorksSection } from './components/how-it-works-section'
import { ProblemSection } from './components/problem-section'
import { TrustSection } from './components/trust-section'

export function LandingPage() {
  return (
    <PageShell width="none" frame="none">
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <TrustSection />
      <FounderSection />
      <FaqSection />
      <CtaSection />
    </PageShell>
  )
}
