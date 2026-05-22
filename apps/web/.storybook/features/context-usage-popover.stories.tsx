import type { Meta, StoryObj } from '@storybook/react-vite'
import { ContextUsagePopover } from '@web/features/agent/context-usage-popover'
import type {
  ContextCategoryUsage,
  DisputeAgentCompactionState,
  DisputeAgentContextState,
} from '@web/features/agent/hooks/use-dispute-agent-chat'

const WINDOW = 256_000

// Token magnitudes are intentionally spread across single digits, tens,
// hundreds, and thousands so the formatter (n / Nk / N.Nk) is exercised
// across the existing stories without needing a dedicated formatter story.
const SYSTEM_TOOLS: ContextCategoryUsage[] = [
  { label: 'connectMcpServer', category: 'system_tools', tokens: 312 },
  { label: 'listMcpServers', category: 'system_tools', tokens: 286 },
  { label: 'registerAppDataSource', category: 'system_tools', tokens: 248 },
  { label: 'fetchUrl', category: 'system_tools', tokens: 188 },
  { label: 'getCurrentMode', category: 'system_tools', tokens: 42 },
  { label: 'ping', category: 'system_tools', tokens: 7 },
]

const MCP_TOOLS: ContextCategoryUsage[] = [
  { label: 'mcp__planetscale__run_query', category: 'mcp_tools', tokens: 1_820 },
  { label: 'mcp__planetscale__get_schema', category: 'mcp_tools', tokens: 1_240 },
  { label: 'mcp__planetscale__list_databases', category: 'mcp_tools', tokens: 612 },
  { label: 'mcp__planetscale__list_branches', category: 'mcp_tools', tokens: 472 },
  { label: 'mcp__planetscale__create_branch', category: 'mcp_tools', tokens: 458 },
  { label: 'mcp__planetscale__list_organizations', category: 'mcp_tools', tokens: 412 },
  { label: 'mcp__planetscale__get_insights', category: 'mcp_tools', tokens: 396 },
  { label: 'mcp__planetscale__list_deploy_requests', category: 'mcp_tools', tokens: 354 },
  { label: 'mcp__planetscale__health_check', category: 'mcp_tools', tokens: 18 },
]

function sumTokens(children: ContextCategoryUsage[]): number {
  return children.reduce((sum, child) => sum + child.tokens, 0)
}

function buildContext(args: {
  systemPromptTokens: number
  systemTools?: ContextCategoryUsage[]
  mcpTools?: ContextCategoryUsage[]
  messagesTokens: number
  realInputTokens?: number
  compactAtTokens?: number
  compaction?: DisputeAgentCompactionState
}): DisputeAgentContextState {
  const systemTools = args.systemTools ?? []
  const mcpTools = args.mcpTools ?? []
  const systemToolsTokens = sumTokens(systemTools)
  const mcpToolsTokens = sumTokens(mcpTools)
  const total = args.systemPromptTokens + systemToolsTokens + mcpToolsTokens + args.messagesTokens
  const compactAtTokens = args.compactAtTokens ?? 200_000
  const realInput = args.realInputTokens ?? total
  const usageTotal = realInput + 120
  return {
    modelName: 'gemma-4-26b',
    windowTokens: WINDOW,
    compactAtTokens,
    status: usageTotal >= compactAtTokens ? 'compact_required' : 'ok',
    compaction: args.compaction ?? { status: 'idle' },
    usage: {
      inputTokens: realInput,
      outputTokens: 120,
      totalTokens: usageTotal,
      updatedAt: new Date().toISOString(),
    },
    estimatedUsage: {
      total,
      byCategory: [
        {
          label: 'System prompt',
          category: 'system_prompt',
          tokens: args.systemPromptTokens,
        },
        {
          label: 'System tools',
          category: 'system_tools',
          tokens: systemToolsTokens,
          children: systemTools,
        },
        {
          label: 'MCP tools',
          category: 'mcp_tools',
          tokens: mcpToolsTokens,
          children: mcpTools,
        },
        { label: 'Messages', category: 'messages', tokens: args.messagesTokens },
      ],
    },
  }
}

function formatLabel(context: DisputeAgentContextState): React.ReactNode {
  if (context.compaction.status === 'compacting') {
    return <span className={labelClass(context)}>Compacting… 4s</span>
  }
  if (context.compaction.status === 'failed') {
    return <span className={labelClass(context)}>Compaction failed</span>
  }
  const used = context.estimatedUsage.total
  return (
    <>
      <span>Context:</span>
      <span className={labelClass(context)}>
        {formatK(used)} / {formatK(context.windowTokens)}
      </span>
    </>
  )
}

function formatAriaLabel(context: DisputeAgentContextState): string {
  if (context.compaction.status === 'compacting') return 'Compacting… 4s'
  if (context.compaction.status === 'failed') return 'Context compaction failed'
  const used = context.estimatedUsage.total
  return `Context: ${formatK(used)} of ${formatK(context.windowTokens)} tokens`
}

function formatK(value: number): string {
  if (value < 1000) return value.toLocaleString()
  return `${Math.round(value / 1000)}k`
}

function labelClass(context: DisputeAgentContextState): string {
  if (context.compaction.status === 'failed') return 'text-destructive-muted-foreground'
  if (context.compaction.status === 'compacting') return 'text-warning-muted-foreground'
  if (context.status === 'compact_required') return 'text-destructive-muted-foreground'
  const warnAt = context.compactAtTokens - context.windowTokens * 0.2
  if (context.estimatedUsage.total >= warnAt) return 'text-warning-muted-foreground'
  return 'text-foreground'
}

function Showcase({ context }: { context: DisputeAgentContextState }) {
  return (
    <div className="flex min-h-[520px] items-end justify-center p-8">
      <ContextUsagePopover
        context={context}
        label={formatLabel(context)}
        ariaLabel={formatAriaLabel(context)}
        onCancelCompaction={() => console.info('cancel compaction clicked')}
        defaultOpen
      />
    </div>
  )
}

const meta: Meta<typeof Showcase> = {
  title: 'Features/Disputes/Components/Context Usage Popover',
  component: Showcase,
  parameters: { layout: 'centered' },
}
export default meta
type Story = StoryObj<typeof Showcase>

export const FreshAgent: Story = {
  name: 'Fresh agent (no usage)',
  args: {
    context: buildContext({
      systemPromptTokens: 0,
      messagesTokens: 0,
      realInputTokens: 0,
    }),
  },
}

export const SetupMode: Story = {
  name: 'Setup mode (system tools only)',
  args: {
    context: buildContext({
      systemPromptTokens: 891,
      systemTools: SYSTEM_TOOLS,
      messagesTokens: 320,
    }),
  },
}

export const OperateModeWithMcp: Story = {
  name: 'Operate mode (with MCP tools)',
  args: {
    context: buildContext({
      systemPromptTokens: 1_240,
      systemTools: SYSTEM_TOOLS,
      mcpTools: MCP_TOOLS,
      messagesTokens: 12_800,
    }),
  },
}

export const ApproachingThreshold: Story = {
  name: 'Approaching threshold (warning)',
  args: {
    context: buildContext({
      systemPromptTokens: 1_240,
      systemTools: SYSTEM_TOOLS,
      mcpTools: MCP_TOOLS,
      messagesTokens: 180_000,
      realInputTokens: 184_700,
      compactAtTokens: 200_000,
    }),
  },
}

export const OverThreshold: Story = {
  name: 'Over threshold (compact required)',
  args: {
    context: buildContext({
      systemPromptTokens: 1_240,
      systemTools: SYSTEM_TOOLS,
      mcpTools: MCP_TOOLS,
      messagesTokens: 205_000,
      realInputTokens: 210_500,
      compactAtTokens: 200_000,
    }),
  },
}

export const Compacting: Story = {
  name: 'Compacting in progress',
  args: {
    context: buildContext({
      systemPromptTokens: 1_240,
      systemTools: SYSTEM_TOOLS,
      mcpTools: MCP_TOOLS,
      messagesTokens: 205_000,
      realInputTokens: 210_500,
      compactAtTokens: 200_000,
      compaction: { status: 'compacting', startedAt: new Date().toISOString() },
    }),
  },
}

export const CompactionFailed: Story = {
  name: 'Compaction failed',
  args: {
    context: buildContext({
      systemPromptTokens: 1_240,
      systemTools: SYSTEM_TOOLS,
      mcpTools: MCP_TOOLS,
      messagesTokens: 205_000,
      realInputTokens: 210_500,
      compactAtTokens: 200_000,
      compaction: {
        status: 'failed',
        failedAt: new Date().toISOString(),
        message: 'Rate limit exceeded while summarizing older messages',
      },
    }),
  },
}

export const StressTestHundredsOfTools: Story = {
  name: 'Stress test (200+ MCP tools)',
  args: {
    context: buildContext({
      systemPromptTokens: 1_240,
      systemTools: SYSTEM_TOOLS,
      mcpTools: generateManyMcpTools(200),
      messagesTokens: 8_000,
    }),
  },
}

function generateManyMcpTools(count: number): ContextCategoryUsage[] {
  const providers = [
    { name: 'planetscale', actions: ['list', 'get', 'create', 'delete', 'update', 'query'] },
    { name: 'stripe', actions: ['retrieve', 'list', 'create', 'update', 'cancel', 'refund'] },
    { name: 'sentry', actions: ['list_issues', 'get_issue', 'resolve', 'comment', 'search'] },
    { name: 'posthog', actions: ['query_events', 'list_persons', 'get_funnel', 'track'] },
    { name: 'ahrefs', actions: ['site_audit', 'keyword_research', 'backlinks', 'ranking'] },
    { name: 'linear', actions: ['list_issues', 'create_issue', 'update', 'list_projects'] },
    { name: 'slack', actions: ['send_message', 'list_channels', 'search', 'react'] },
    { name: 'github', actions: ['list_prs', 'create_issue', 'list_repos', 'merge'] },
    { name: 'notion', actions: ['list_pages', 'create_page', 'update_page', 'search'] },
    { name: 'gdrive', actions: ['list_files', 'get_content', 'create_file', 'search'] },
  ]
  const resources = ['users', 'orders', 'sessions', 'events', 'logs', 'metrics', 'reports']
  const tools: ContextCategoryUsage[] = []
  for (let i = 0; tools.length < count; i += 1) {
    const provider = providers[i % providers.length]!
    const action = provider.actions[Math.floor(i / providers.length) % provider.actions.length]!
    const resource = resources[i % resources.length]!
    const label = `mcp__${provider.name}__${action}_${resource}`
    // Pseudo-deterministic spread of token counts: 180–820
    const tokens = 180 + ((i * 37 + 13) % 640)
    tools.push({ label, category: 'mcp_tools', tokens })
  }
  return tools.toSorted((a, b) => b.tokens - a.tokens)
}

export const ManyMcpTools: Story = {
  name: 'Many MCP tools (scroll inside)',
  args: {
    context: buildContext({
      systemPromptTokens: 1_240,
      systemTools: SYSTEM_TOOLS,
      mcpTools: [
        ...MCP_TOOLS,
        { label: 'mcp__stripe__retrieve_dispute', category: 'mcp_tools', tokens: 642 },
        { label: 'mcp__stripe__list_disputes', category: 'mcp_tools', tokens: 528 },
        { label: 'mcp__stripe__update_dispute', category: 'mcp_tools', tokens: 510 },
        { label: 'mcp__stripe__retrieve_customer', category: 'mcp_tools', tokens: 446 },
        { label: 'mcp__stripe__list_charges', category: 'mcp_tools', tokens: 412 },
        { label: 'mcp__stripe__create_evidence', category: 'mcp_tools', tokens: 386 },
        { label: 'mcp__sentry__list_issues', category: 'mcp_tools', tokens: 352 },
        { label: 'mcp__sentry__get_issue', category: 'mcp_tools', tokens: 318 },
        { label: 'mcp__posthog__query_events', category: 'mcp_tools', tokens: 304 },
        { label: 'mcp__posthog__list_persons', category: 'mcp_tools', tokens: 286 },
      ],
      messagesTokens: 24_000,
    }),
  },
}
