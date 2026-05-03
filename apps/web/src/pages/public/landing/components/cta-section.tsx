import Section from '@web/ui/components/layout/section'

export function CtaSection() {
  return (
    <Section id="get-started" background="panel">
      <div className="container-max-w-5xl flex flex-col items-center">
        <h2 className="text-display text-center">Stop losing disputes you should win</h2>

        <div className="mt-12 grid w-full grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-border bg-surface p-8">
            <h3>Cloud</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              Connect Stripe. Connect your database. Done.
            </p>
            <a
              href="/sign-in"
              className="mt-6 inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 font-medium text-accent-foreground no-underline shadow-[0_0_24px_-4px_var(--lime-a5)] transition-colors hover:bg-accent-hover hover:no-underline"
            >
              Get Started Free
            </a>
          </div>

          <div className="flex flex-col rounded-lg border border-border bg-surface p-8">
            <h3>Self-hosted</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              Deploy to your own Cloudflare account. Full control. AGPLv3.
            </p>
            <a
              href="https://github.com/alexander-zuev/riposte"
              className="mt-6 inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 font-medium text-foreground no-underline transition-colors hover:bg-surface-hover hover:no-underline"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </Section>
  )
}
