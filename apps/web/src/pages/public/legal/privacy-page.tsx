import { Logo } from '@web/ui/components/ui/logo'

const EFFECTIVE_DATE = 'May 3, 2026'
const CONTACT_EMAIL = 'legal@riposte.sh'

export function PrivacyPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo variant="full" size="sm" href="/" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
        <h1>Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective: {EFFECTIVE_DATE}</p>

        <div className="prose-legal mt-10 flex flex-col gap-8">
          <Section title="1. Overview">
            <p>
              Riposte ("Service") is operated by Kollektiv LLC ("we", "us"). This policy explains
              what data we collect, why, and how we protect it.
            </p>
            <p>We collect only what's necessary to run the Service. We don't sell your data.</p>
          </Section>

          <Section title="2. Data We Collect">
            <h6>Account Data</h6>
            <ul>
              <li>Email address (for authentication and communication)</li>
              <li>Name (if provided)</li>
            </ul>

            <h6>Stripe Data</h6>
            <p>When you connect your Stripe account, we access:</p>
            <ul>
              <li>Dispute details (reason, amount, status, deadlines)</li>
              <li>Related transaction and charge data</li>
              <li>Customer information relevant to disputes</li>
              <li>Shipping and fulfillment data</li>
            </ul>
            <p>
              We access this data through the Stripe API using OAuth tokens you authorize. We only
              read what's needed to build dispute evidence.
            </p>

            <h6>Merchant Customer Data</h6>
            <p>
              When merchants connect their data sources, Riposte may access data about customers
              involved in active disputes. This may include, but is not limited to:
            </p>
            <ul>
              <li>Customer identity (e.g. email, user ID, IP address)</li>
              <li>Session and access data (e.g. logins, devices, timestamps, geolocation)</li>
              <li>Product usage and activity</li>
              <li>Delivered outputs or proof of service</li>
              <li>Support and communication history</li>
              <li>Cancellation, refund, or billing history</li>
            </ul>
            <p>
              Access is read-only, scoped to the dispute period, and used solely to compile dispute
              evidence. The specific data accessed depends on what the merchant connects and what is
              relevant to the dispute.
            </p>

            <h6>Usage Data</h6>
            <ul>
              <li>Pages visited, features used</li>
              <li>Browser type, device info</li>
              <li>IP address</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Data">
            <ul>
              <li>Build dispute evidence from merchant customer data</li>
              <li>Submit dispute evidence to Stripe</li>
              <li>
                Process merchant customer data through AI models to generate evidence documents
              </li>
              <li>Track dispute outcomes and improve win rates</li>
              <li>Authenticate you and secure your account</li>
              <li>Send transactional emails (dispute updates, account alerts)</li>
              <li>Improve the Service</li>
            </ul>
          </Section>

          <Section title="4. Data Sharing">
            <p>We share data only when necessary:</p>
            <ul>
              <li>
                <strong>Stripe</strong> — dispute evidence submitted via their API
              </li>
              <li>
                <strong>Infrastructure providers</strong> — Cloudflare (hosting, Workers AI, AI
                Gateway where used, storage, and edge networking) and PlanetScale (database)
              </li>
              <li>
                <strong>AI processing</strong> — merchant customer data may be processed through AI
                services hosted on Cloudflare to generate evidence documents. Cloudflare does not
                use Workers AI customer content to train AI models. Where AI Gateway is used for
                merchant customer content, we disable or avoid request and response payload logging
              </li>
              <li>
                <strong>Analytics</strong> — PostHog for product analytics, including account-user
                identifiers and product usage telemetry
              </li>
              <li>
                <strong>Error monitoring</strong> — Sentry for error tracking, diagnostics, and
                related account-user context
              </li>
              <li>
                <strong>Email delivery</strong> — Resend for transactional emails such as sign-in
                links, account notices, and dispute updates
              </li>
            </ul>
            <p>We don't sell, rent, or trade your data to third parties.</p>
          </Section>

          <Section title="5. Data Retention">
            <ul>
              <li>Account data: retained while your account is active</li>
              <li>
                Stripe and merchant customer data: retained for the duration of dispute processing,
                then deleted within 90 days of dispute resolution
              </li>
              <li>Usage data: aggregated and anonymized after 12 months</li>
            </ul>
            <p>You can request deletion of your data at any time by contacting us.</p>
          </Section>

          <Section title="6. Data Processing Role">
            <p>
              When handling merchant customer data, Riposte acts as a data processor on behalf of
              the merchant (data controller). We process this data only as instructed by the
              merchant, only for active disputes, and under the terms of a Data Processing Agreement
              incorporated into our Terms of Service.
            </p>
            <p>
              If you are a customer of a Riposte merchant and your data was used in a dispute
              response, you may contact the merchant directly to exercise your data rights. Riposte
              does not independently decide what merchant customer data to collect or how to use it.
            </p>
          </Section>

          <Section title="7. Security">
            <p>
              We use industry-standard measures to protect your data: encrypted connections (TLS),
              encrypted secrets at rest, and access controls. Stripe API tokens are stored encrypted
              and never exposed in logs or client-side code.
            </p>
          </Section>

          <Section title="8. Your Rights">
            <p>You can:</p>
            <ul>
              <li>Access your data by contacting us</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Revoke Stripe access at any time via your Stripe dashboard</li>
              <li>Export your data</li>
            </ul>
            <p>
              If you're in the EU/EEA, you have additional rights under GDPR including the right to
              data portability and the right to lodge a complaint with a supervisory authority.
            </p>
          </Section>

          <Section title="9. Cookies">
            <p>
              We use essential cookies for authentication and session management. We use PostHog for
              analytics. You can disable non-essential cookies in your browser settings.
            </p>
          </Section>

          <Section title="10. Changes">
            <p>
              We may update this policy. We'll notify you of material changes via email or in-app
              notice. Continued use after changes constitutes acceptance.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>If you have any questions about this Privacy Policy, please contact us at:</p>
            <p>
              Email:{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline">
                {CONTACT_EMAIL}
              </a>
              <br />
              Company: Kollektiv LLC
              <br />
              Address: 701 Tillery Street Unit 12, 2874, Austin, TX 78702
            </p>
          </Section>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3>{title}</h3>
      <div className="mt-3 flex flex-col gap-3 text-sm text-muted-foreground">{children}</div>
    </section>
  )
}
