import { Logo } from '@web/ui/components/ui/logo'

const LAST_UPDATED = 'May 8, 2026'
const CONTACT_EMAIL = 'legal@riposte.sh'

export function SubProcessorsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo variant="full" size="sm" href="/" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
        <h1>Sub-processors</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="prose-legal mt-10 flex flex-col gap-8">
          <section>
            <p className="text-sm text-muted-foreground">
              Riposte uses the following sub-processors to deliver the Service. Each sub-processor
              is bound by a data processing agreement with obligations no less protective than those
              in our Terms of Service. We will update this page and notify affected customers before
              engaging a new sub-processor.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Riposte distinguishes between Riposte account-user data and merchant customer dispute
              data. Analytics and error monitoring sub-processors process Riposte account-user
              telemetry and diagnostics, not merchant customer dispute evidence.
            </p>
          </section>

          <section>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Sub-processor</th>
                    <th className="px-4 py-3 text-left font-medium">Purpose</th>
                    <th className="px-4 py-3 text-left font-medium">Location</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3">Cloudflare, Inc.</td>
                    <td className="px-4 py-3">
                      Application hosting, storage, Workers AI, AI Gateway where used, and edge
                      networking
                    </td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3">PlanetScale</td>
                    <td className="px-4 py-3">Application database hosting</td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3">PostHog, Inc.</td>
                    <td className="px-4 py-3">
                      Product analytics for Riposte account-user activity
                    </td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3">Functional Software, Inc. dba Sentry</td>
                    <td className="px-4 py-3">
                      Error tracking and diagnostics for Riposte account-user sessions and service
                      errors
                    </td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3">Plus Five Five, Inc. dba Resend</td>
                    <td className="px-4 py-3">Transactional email delivery</td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Stripe</td>
                    <td className="px-4 py-3">
                      Payment processing, billing, connected Stripe account access, and dispute
                      evidence submission
                    </td>
                    <td className="px-4 py-3">United States</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3>Transfer mechanisms</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              All sub-processors listed above are certified under the EU-US Data Privacy Framework
              and/or maintain Standard Contractual Clauses for international data transfers. Stripe
              entities may vary by product, account location, and processing role.
            </p>
          </section>

          <section>
            <h3>Questions</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">
                {CONTACT_EMAIL}
              </a>{' '}
              with any questions about our sub-processors.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
