import { Logo } from '@web/ui/components/ui/logo'

const EFFECTIVE_DATE = 'May 3, 2026'
const CONTACT_EMAIL = 'legal@riposte.sh'

export function TermsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo variant="full" size="sm" href="/" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
        <h1>Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Effective: {EFFECTIVE_DATE}</p>

        <div className="prose-legal mt-10 flex flex-col gap-8">
          <Section title="1. Agreement">
            <p>
              By accessing or using Riposte ("Service"), operated by Kollektiv LLC ("we", "us"), you
              agree to these Terms. If you don't agree, don't use the Service.
            </p>
          </Section>

          <Section title="2. What Riposte Does">
            <p>
              Riposte is an open-source AI agent that helps you respond to Stripe payment disputes.
              It connects to your Stripe account, analyzes dispute data, assembles evidence, and
              submits responses on your behalf.
            </p>
            <p>
              We do not guarantee any specific outcome. Dispute decisions are made by card networks
              and issuers, not by us.
            </p>
          </Section>

          <Section title="3. Eligibility">
            <p>
              You must be at least 18 years old and have a valid Stripe account. By using the
              Service, you represent that you have the authority to connect your Stripe account and
              authorize automated dispute responses.
            </p>
          </Section>

          <Section title="4. Your Account">
            <p>
              You are responsible for maintaining the security of your account credentials and
              Stripe API keys. You are responsible for all activity under your account.
            </p>
          </Section>

          <Section title="5. Stripe Integration">
            <p>
              Riposte accesses your Stripe account via the Stripe API. By connecting your account,
              you authorize us to read dispute data, retrieve transaction and customer information,
              and submit dispute evidence on your behalf.
            </p>
            <p>You can revoke access at any time through your Stripe dashboard.</p>
          </Section>

          <Section title="6. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for fraudulent disputes or false evidence</li>
              <li>Submit fabricated or misleading documentation</li>
              <li>Attempt to circumvent Stripe's terms of service</li>
              <li>Reverse-engineer, attack, or abuse the Service</li>
            </ul>
          </Section>

          <Section title="7. Open Source">
            <p>
              Riposte's source code is licensed under AGPLv3. These Terms govern your use of the
              hosted Service at riposte.sh, not self-hosted instances.
            </p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>
              The Service is provided "as is" without warranties of any kind. We are not liable for
              lost disputes, revenue loss, or any indirect, incidental, or consequential damages
              arising from your use of the Service.
            </p>
            <p>
              Our total liability is limited to the amount you paid us in the 12 months preceding
              the claim.
            </p>
          </Section>

          <Section title="9. Termination">
            <p>
              We may suspend or terminate your access at any time for violation of these Terms. You
              may stop using the Service at any time by disconnecting your Stripe account and
              deleting your account.
            </p>
          </Section>

          <Section title="10. Changes">
            <p>
              We may update these Terms. We'll notify you of material changes via email or in-app
              notice. Continued use after changes constitutes acceptance.
            </p>
          </Section>

          <Section title="11. Governing Law">
            <p>
              These Terms are governed by the laws of the State of Wyoming, United States, without
              regard to conflict of law principles. Any disputes shall be resolved in the courts of
              Wyoming.
            </p>
          </Section>

          <Section title="12. Contact">
            <p>If you have any questions about these Terms, please contact us at:</p>
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
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  )
}
