import Section from '@web/ui/components/layout/section'

import { TerminalDemo } from './terminal-demo'

export function HeroSection() {
  return (
    <Section noPadding className="pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="container-max-w-6xl flex flex-col items-center text-center">
        <h1 className="text-display-hero max-w-4xl">
          Win your Stripe disputes <span className="text-accent">on autopilot</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          AI agent that handles your Stripe disputes end-to-end — gathers what your customers
          actually did, builds the case, and responds automatically. You focus on your product, not
          evidence.
        </p>

        <div className="mt-8">
          <a
            href="/sign-in"
            className="inline-flex items-center rounded-md bg-accent px-6 py-3 font-medium text-accent-foreground no-underline shadow-[0_0_24px_-4px_var(--amber-a5)] transition-colors hover:bg-accent-hover hover:no-underline"
          >
            Get Started Free
          </a>
        </div>

        <div className="mt-8 flex items-center gap-2">
          <div className="flex -space-x-2">
            {['a', 'b', 'c', 'd', 'e'].map((id) => (
              <div
                key={id}
                className="h-8 w-8 rounded-full border-2 border-background bg-surface"
              />
            ))}
          </div>
          <span className="ml-2 text-sm text-muted-foreground">Become an early adopter</span>
        </div>

        <div className="mt-16 w-full">
          <TerminalDemo />
        </div>
      </div>
    </Section>
  )
}
