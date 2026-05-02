import Section from '@web/ui/components/layout/section'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@web/ui/components/ui/accordion'

import { SectionBadge } from './section-badge'

const faqs = [
  {
    question: 'What data does Riposte access?',
    answer:
      'Riposte connects to your Stripe account and your application database (read-only). It checks real customer activity — sessions, usage, login history, support tickets — to build evidence that proves the customer actually used your product.',
  },
  {
    question: 'Is my data safe?',
    answer:
      'All access is read-only. Riposte never writes to your database or modifies anything in Stripe. You control exactly which API scopes to grant, and you can revoke access anytime. The entire codebase is open-source — inspect every line.',
  },
  {
    question: 'Does the AI make up evidence?',
    answer:
      'No. Evidence gathering is 90% deterministic — real queries against your real data. AI is only used to draft the written argument based on the facts already collected. No hallucinated data, no fabricated screenshots.',
  },
  {
    question: 'Can I self-host Riposte?',
    answer:
      'Yes. Riposte is AGPLv3 and designed to deploy to your own Cloudflare account. You get full control over your data and infrastructure. The managed cloud version is available if you prefer not to self-host.',
  },
  {
    question: 'What types of disputes does Riposte handle?',
    answer:
      'Riposte handles all Stripe dispute types — fraudulent, product not received, subscription canceled, duplicate, and more. It adapts the evidence and argument structure based on the dispute reason.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'No percentage fees. No per-dispute charges. Pricing is a flat monthly subscription based on dispute volume. Self-hosted is free forever.',
  },
]

export function FaqSection() {
  return (
    <Section>
      <div className="container-max-w-4xl flex flex-col items-center">
        <SectionBadge>FAQ</SectionBadge>

        <h2 className="text-display mt-4 text-center">Common questions</h2>

        <div className="mt-12 w-full">
          <Accordion>
            {faqs.map((faq) => (
              <AccordionItem key={faq.question} value={faq.question}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </Section>
  )
}
