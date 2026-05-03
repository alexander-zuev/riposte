import Section from '@web/ui/components/layout/section'

export function HeroSection() {
  return (
    <Section noPadding className="flex min-h-[80vh] items-center pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="container-max-w-5xl flex flex-col items-center text-center">
        <h1 className="text-display-hero max-w-4xl">
          Win your Stripe disputes <span className="text-accent">on autopilot</span>
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Open-source AI agent that pulls evidence from your database and submits it in under 60
          seconds.
        </p>

        <div className="mt-8">
          <a
            href="/sign-in"
            className="inline-flex items-center rounded-md bg-accent px-6 py-3 font-medium text-accent-foreground no-underline transition-colors hover:bg-accent-hover hover:no-underline"
          >
            Get Started Free
          </a>
        </div>

        <p className="mt-6 text-system text-sm text-muted-foreground">
          You have 7–21 days to respond. Riposte takes 47 seconds.
        </p>

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
      </div>
    </Section>
  )
}
