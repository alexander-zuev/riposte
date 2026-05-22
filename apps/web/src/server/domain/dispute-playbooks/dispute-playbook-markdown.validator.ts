import type { PlaybookVerification, ValidationIssue } from '@riposte/core'

export const REQUIRED_DISPUTE_PLAYBOOK_SECTIONS = [
  'Customer matching',
  'Activity sources',
  'Cancellation detection',
  'Refund request detection',
  'Visual deliverables',
  'Strongest signals',
  'Gotchas',
] as const

const MIN_PLAYBOOK_MD_LENGTH = 300
const MIN_SECTION_BODY_LENGTH = 40

export function validateDisputePlaybookMarkdown(
  playbookMd: string,
  options: { initialRevision: boolean; playbookVerification?: PlaybookVerification },
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!/^# .+ Dispute Playbook\s*$/m.test(playbookMd)) {
    issues.push({
      code: 'missing_playbook_title',
      path: ['playbookMd'],
      message: 'Playbook must start with a "# {Product name} Dispute Playbook" title.',
    })
  }

  if (playbookMd.trim().length < MIN_PLAYBOOK_MD_LENGTH) {
    issues.push({
      code: 'playbook_too_short',
      path: ['playbookMd'],
      message: `Playbook must be at least ${MIN_PLAYBOOK_MD_LENGTH} characters.`,
    })
  }

  for (const section of REQUIRED_DISPUTE_PLAYBOOK_SECTIONS) {
    const body = sectionBody(playbookMd, section)
    if (body === null) {
      issues.push({
        code: 'missing_playbook_section',
        path: ['playbookMd', section],
        message: `Playbook is missing "## ${section}".`,
      })
      continue
    }

    if (body.length < MIN_SECTION_BODY_LENGTH) {
      issues.push({
        code: 'playbook_section_too_short',
        path: ['playbookMd', section],
        message: `"## ${section}" must have at least ${MIN_SECTION_BODY_LENGTH} characters.`,
      })
    }
  }

  if (options.initialRevision) {
    if (!options.playbookVerification) {
      issues.push({
        code: 'missing_playbook_verification',
        path: ['playbookVerification'],
        message: 'Initial playbook revision requires structured verification.',
      })
    }
  }

  return issues
}

function sectionBody(playbookMd: string, section: string): string | null {
  const lines = playbookMd.split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === `## ${section}`)
  if (start === -1) return null

  const nextSection = lines.findIndex(
    (line, index) => index > start && line.trim().startsWith('## '),
  )
  const body = lines.slice(start + 1, nextSection === -1 ? undefined : nextSection).join('\n')
  return body.trim()
}
