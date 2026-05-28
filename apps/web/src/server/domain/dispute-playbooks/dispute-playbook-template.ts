import {
  PLAYBOOK_SECTIONS,
  PLAYBOOK_SOURCE_MARKER,
  type PlaybookSectionHeading,
} from './dispute-playbook.sections'

/** Terse structural hints; full strategic guidance lives in the system prompt. */
const SECTION_HINTS: Record<PlaybookSectionHeading, string> = {
  'Customer matching':
    'strict join from Stripe charge.customer to the app-stored stripe_customer_id',
  'Identity facts': 'where accountCreatedAt and lastActiveAt come from after the match',
  'Activity sources':
    'where product-use events live, how to filter by matched user, which fields/statuses count',
  'Cancellation detection': 'where cancellation state/requests live, or state it is not applicable',
  'Refund request detection': 'where refund requests live, or state Stripe refunds only',
  'Visual deliverables': 'customer-facing artifacts, or state this product has none',
  'Evidence emphasis': 'which verified facts to prioritize, which are weak or noisy',
  'Known constraints': 'optional: up to 7 runtime guardrails',
}

/**
 * Seed skeleton returned by `read` when no playbook exists yet. The agent fills the
 * `<…>` hints and `Source:` markers; the title and headings are correct by construction
 * so the model never has to reproduce the required structure.
 */
export function buildPlaybookTemplate(productName: string): string {
  const title = `# ${productName} Dispute Playbook`
  const body = PLAYBOOK_SECTIONS.map((section) => {
    const lines = [`## ${section.heading}`]
    if (section.needsSource) lines.push(PLAYBOOK_SOURCE_MARKER)
    lines.push(`<${SECTION_HINTS[section.heading]}>`)
    return lines.join('\n')
  }).join('\n\n')
  return `${title}\n\n${body}\n`
}
