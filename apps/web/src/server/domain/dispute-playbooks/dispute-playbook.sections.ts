/**
 * Canonical dispute-playbook section definitions. Single source of truth for the
 * authoring template, the system-prompt guidance, and the domain validator. Editing
 * this list changes all three together and prevents prompt/validator drift.
 */

export type PlaybookSection = {
  /** Exact `## ` heading text expected in the markdown. */
  heading: string
  /** Section must be present for the playbook to be complete. */
  required: boolean
  /** Section must carry a filled `Source:` provenance line. */
  needsSource: boolean
}

export const PLAYBOOK_SECTIONS = [
  { heading: 'Customer matching', required: true, needsSource: true },
  { heading: 'Identity facts', required: true, needsSource: false },
  { heading: 'Activity sources', required: true, needsSource: true },
  { heading: 'Cancellation detection', required: true, needsSource: true },
  { heading: 'Refund request detection', required: true, needsSource: true },
  { heading: 'Visual deliverables', required: true, needsSource: false },
  { heading: 'Evidence emphasis', required: true, needsSource: false },
  { heading: 'Known constraints', required: false, needsSource: false },
] as const satisfies readonly PlaybookSection[]

export type PlaybookSectionHeading = (typeof PLAYBOOK_SECTIONS)[number]['heading']

/**
 * Line prefix that satisfies the provenance requirement on `needsSource` sections.
 * The agent fills it with either a real source or an explicit waiver, e.g.
 * `Source: usage_events.user_id (tool-call: abc123)` or
 * `Source: not applicable - no cancellation flow`.
 */
export const PLAYBOOK_SOURCE_MARKER = 'Source:'
