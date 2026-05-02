import Section from '@web/ui/components/layout/section'

export function FounderSection() {
  return (
    <Section background="panel">
      <div className="container-max-w-4xl flex flex-col items-center text-center">
        <div className="h-20 w-20 rounded-full border border-border bg-surface" />

        <p className="mt-6 text-foreground">
          I built this because I watched SaaS founders spend hours per dispute assembling evidence
          that was already sitting in their database.
        </p>
        <p className="mt-4 text-muted-foreground">
          The tools that exist either use generic Stripe data or charge 25-30% of what they recover.
          Riposte connects to your actual data and builds the case automatically. Open-source,
          self-hostable, no percentage fees.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">— Alexander, creator of Riposte</p>
      </div>
    </Section>
  )
}
