import { ActivityFeed, type AgentActivityEntry } from '@web/features/agent/activity-feed'
import type { AgentMode } from '@web/features/agent/agent-mode'

type ActivityTabProps = {
  mode: AgentMode
}

/**
 * Activity tab — audit feed during setup, dispute operations feed post-setup.
 * Backend audit-event recording is a later slice; until then entries is empty
 * and the empty state speaks for the mode.
 */
export function ActivityTab({ mode }: ActivityTabProps) {
  // TODO(agent): replace with a real query against the agent audit log.
  // Setup-mode events: stripe_connected, mcp_connected, dry_run_complete,
  // playbook_drafted. Post-setup events: dispute_received, evidence_collected,
  // packet_submitted, dispute_won, etc.
  const entries: AgentActivityEntry[] = []

  const empty = emptyStateFor(mode)
  return <ActivityFeed entries={entries} emptyTitle={empty.title} emptyMessage={empty.message} />
}

function emptyStateFor(mode: AgentMode): { title: string; message: string } {
  if (mode === 'setup') {
    return {
      title: 'No activity yet',
      message: 'Connect your data sources and run the dry-run to populate the audit feed',
    }
  }
  return {
    title: 'Agent is idle',
    message: "As disputes come in, the agent's actions will appear here",
  }
}
