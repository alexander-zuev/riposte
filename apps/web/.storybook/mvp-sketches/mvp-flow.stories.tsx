import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo, useReducer, useState } from 'react'

const meta: Meta = {
  title: 'MVP Sketches/Automated Dispute Agent',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

type ConnectorStatus = 'not_connected' | 'validating' | 'connected' | 'expired' | 'failed'
type CaseStatus =
  | 'received'
  | 'investigating'
  | 'evidence_ready'
  | 'submitted'
  | 'waiting'
  | 'won'
  | 'lost'
  | 'failed'

type Connector = {
  id: string
  label: string
  scope: string
  status: ConnectorStatus
  lastRefresh: string
  nextRefresh: string
}

type DisputeCase = {
  id: string
  customer: string
  amount: string
  reason: string
  due: string
  status: CaseStatus
  strength: number
}

type TimelineItem = {
  time: string
  title: string
  detail: string
  state: 'done' | 'active' | 'blocked' | 'pending'
}

const initialConnectors: Connector[] = [
  {
    id: 'stripe',
    label: 'Stripe',
    scope: 'disputes.read, disputes.write, customers.read, charges.read',
    status: 'connected',
    lastRefresh: '2 min ago',
    nextRefresh: 'in 58 min',
  },
  {
    id: 'database',
    label: 'Application database',
    scope: 'read-only SQL role, customer/activity tables only',
    status: 'connected',
    lastRefresh: '4 min ago',
    nextRefresh: 'in 26 min',
  },
  {
    id: 'storage',
    label: 'Evidence storage',
    scope: 'read-only screenshots, invoices, deliverables',
    status: 'connected',
    lastRefresh: '7 min ago',
    nextRefresh: 'in 53 min',
  },
  {
    id: 'slack',
    label: 'Slack',
    scope: 'post messages to #chargebacks',
    status: 'connected',
    lastRefresh: '12 min ago',
    nextRefresh: 'in 18 min',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    scope: 'send bot messages to founder chat',
    status: 'not_connected',
    lastRefresh: 'never',
    nextRefresh: 'after setup',
  },
]

const initialCases: DisputeCase[] = [
  {
    id: 'dp_3Qx9Kl2m',
    customer: 'maria@acme.ai',
    amount: '$249.00',
    reason: 'fraudulent',
    due: 'May 12',
    status: 'submitted',
    strength: 92,
  },
  {
    id: 'dp_7Rm4Np8v',
    customer: 'lee@example.com',
    amount: '$89.00',
    reason: 'product_not_received',
    due: 'May 14',
    status: 'investigating',
    strength: 74,
  },
  {
    id: 'dp_2Wf6Bt3j',
    customer: 'founder@studio.dev',
    amount: '$39.00',
    reason: 'subscription_canceled',
    due: 'May 18',
    status: 'won',
    strength: 86,
  },
]

const evidenceFacts = [
  'Account created 2026-04-18 after successful checkout',
  '37 authenticated sessions from same device family',
  'Last active 2 days before dispute',
  'Generated 184 AI outputs and downloaded 16 files',
  'No refund request or support ticket before dispute',
  'Checkout IP matches 34 later login events',
]

const generatedStripeFields = [
  {
    label: 'uncategorized_text',
    value:
      'The cardholder received and used the service after purchase. Riposte found authenticated usage, product delivery events, and matching device/network signals.',
  },
  {
    label: 'access_activity_log',
    value:
      '2026-04-18 signup, 37 sessions, 184 generated outputs, 16 downloads, last activity 2026-05-02.',
  },
  {
    label: 'refund_refusal_explanation',
    value:
      'No refund was refused. The merchant has no record of a refund request before the cardholder opened this dispute.',
  },
]

function statusLabel(status: ConnectorStatus | CaseStatus) {
  return status.replaceAll('_', ' ')
}

function statusTone(status: ConnectorStatus | CaseStatus) {
  if (status === 'connected' || status === 'won' || status === 'submitted') return 'bg-zinc-900 text-white'
  if (status === 'failed' || status === 'expired' || status === 'lost') return 'bg-white text-zinc-950 ring-2 ring-zinc-950'
  if (status === 'validating' || status === 'investigating' || status === 'evidence_ready') {
    return 'bg-zinc-200 text-zinc-950'
  }
  return 'bg-white text-zinc-600 ring-1 ring-zinc-300'
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-100 p-6 text-zinc-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-end justify-between border-b-2 border-zinc-950 pb-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-zinc-500">
              Riposte MVP sketch
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-zinc-600">{subtitle}</p>
          </div>
          <div className="hidden border-2 border-zinc-950 bg-white px-3 py-2 text-xs md:block">
            Low fidelity / mocked logic
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function SketchPanel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`border-2 border-zinc-950 bg-white shadow-[5px_5px_0_#18181b] ${className}`}>
      <div className="border-b-2 border-zinc-950 px-4 py-2">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function SketchButton({
  children,
  onClick,
  active = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-2 border-zinc-950 px-3 py-1.5 text-xs font-medium ${
        active ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-950 hover:bg-zinc-100'
      }`}
    >
      {children}
    </button>
  )
}

function StatusPill({ status }: { status: ConnectorStatus | CaseStatus }) {
  return (
    <span className={`inline-flex border border-zinc-950 px-2 py-0.5 text-[11px] font-medium capitalize ${statusTone(status)}`}>
      {statusLabel(status)}
    </span>
  )
}

function WireBox({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="border-2 border-dashed border-zinc-400 bg-zinc-50 p-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      {children ? <div className="mt-2">{children}</div> : <div className="mt-8 h-10 bg-zinc-200" />}
    </div>
  )
}

function ConnectorRow({
  connector,
  onRefresh,
  onBreak,
}: {
  connector: Connector
  onRefresh?: () => void
  onBreak?: () => void
}) {
  return (
    <div className="grid gap-3 border-b border-zinc-300 py-3 last:border-b-0 md:grid-cols-[1.2fr_1fr_auto]">
      <div>
        <div className="flex items-center gap-2">
          <strong className="text-sm">{connector.label}</strong>
          <StatusPill status={connector.status} />
        </div>
        <p className="mt-1 text-xs text-zinc-600">{connector.scope}</p>
      </div>
      <div className="text-xs text-zinc-600">
        <div>Last refresh: {connector.lastRefresh}</div>
        <div>Next refresh: {connector.nextRefresh}</div>
      </div>
      <div className="flex gap-2">
        <SketchButton onClick={onRefresh}>Refresh</SketchButton>
        <SketchButton onClick={onBreak}>Break</SketchButton>
      </div>
    </div>
  )
}

function CaseTable({ cases, selectedId, onSelect }: { cases: DisputeCase[]; selectedId?: string; onSelect: (id: string) => void }) {
  return (
    <div className="overflow-hidden border-2 border-zinc-950">
      <table className="w-full text-left text-xs">
        <thead className="bg-zinc-200">
          <tr className="border-b-2 border-zinc-950">
            <th className="px-3 py-2">Case</th>
            <th className="px-3 py-2">Customer</th>
            <th className="px-3 py-2">Reason</th>
            <th className="px-3 py-2">Due</th>
            <th className="px-3 py-2">Strength</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`cursor-pointer border-b border-zinc-300 last:border-b-0 ${
                selectedId === item.id ? 'bg-zinc-100 outline outline-2 outline-zinc-950' : 'bg-white'
              }`}
            >
              <td className="px-3 py-2 font-mono">{item.id}</td>
              <td className="px-3 py-2">{item.customer}</td>
              <td className="px-3 py-2">{item.reason}</td>
              <td className="px-3 py-2">{item.due}</td>
              <td className="px-3 py-2">{item.strength}/100</td>
              <td className="px-3 py-2">
                <StatusPill status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function timelineFor(status: CaseStatus): TimelineItem[] {
  const order: CaseStatus[] = ['received', 'investigating', 'evidence_ready', 'submitted', 'waiting', 'won']
  const currentIndex = order.indexOf(status === 'lost' ? 'won' : status === 'failed' ? 'investigating' : status)
  return [
    {
      time: '00:00',
      title: 'Stripe webhook received',
      detail: 'charge.dispute.created created the case and locked the response due date.',
      state: currentIndex >= 0 ? 'done' : 'pending',
    },
    {
      time: '00:04',
      title: 'Agent queried read-only sources',
      detail: 'Stripe, database, storage, and usage logs were queried using scoped credentials.',
      state: status === 'failed' ? 'blocked' : currentIndex >= 1 ? 'done' : 'pending',
    },
    {
      time: '00:22',
      title: 'Evidence packet generated',
      detail: 'Timeline, facts, generated Stripe fields, and PDF attachment were assembled.',
      state: currentIndex >= 2 ? 'done' : 'pending',
    },
    {
      time: '00:41',
      title: 'Evidence submitted to Stripe',
      detail: 'One-shot submission was recorded with request id and packet hash.',
      state: currentIndex >= 3 ? 'done' : 'pending',
    },
    {
      time: 'days',
      title: status === 'lost' ? 'Issuer marked dispute lost' : 'Issuer marked dispute won',
      detail: status === 'lost' ? 'Dashboard should show evidence gaps.' : '$249 recovered and result added to metrics.',
      state: status === 'won' || status === 'lost' ? 'done' : currentIndex >= 4 ? 'active' : 'pending',
    },
  ]
}

function StepRail({ steps, current, onSelect }: { steps: string[]; current: number; onSelect: (index: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((step, index) => (
        <SketchButton key={step} active={index === current} onClick={() => onSelect(index)}>
          {index + 1}. {step}
        </SketchButton>
      ))}
    </div>
  )
}

export const CompleteMvpFlowMap: Story = {
  name: 'Complete MVP Flow Map',
  render: () => {
    const steps = ['Create workspace', 'Connect systems', 'Verify access', 'Auto-submit dispute', 'Monitor result']
    const [step, setStep] = useState(0)
    return (
      <Shell
        title="Complete MVP flow map"
        subtitle="The 10000 ft operator journey: set up read-only access, automate submission, monitor every case and result."
      >
        <div className="space-y-5">
          <StepRail steps={steps} current={step} onSelect={setStep} />
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <SketchPanel title={steps[step]}>
              {step === 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <WireBox label="Workspace form">
                    <div className="space-y-2">
                      <div className="h-8 border-2 border-zinc-950 bg-white px-2 py-1 text-xs">Acme AI</div>
                      <div className="h-8 border-2 border-zinc-950 bg-white px-2 py-1 text-xs">Digital product / SaaS</div>
                      <div className="h-20 border-2 border-zinc-950 bg-white p-2 text-xs text-zinc-600">
                        Product context used by the agent when explaining what the customer received.
                      </div>
                    </div>
                  </WireBox>
                  <WireBox label="Launch decision">
                    <div className="space-y-2 text-sm">
                      <div className="border-2 border-zinc-950 bg-zinc-950 p-3 text-white">Hosted Riposte workspace</div>
                      <div className="border-2 border-zinc-950 p-3">Self-hosted agent later</div>
                    </div>
                  </WireBox>
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {initialConnectors.slice(0, 4).map((connector) => (
                    <WireBox key={connector.id} label={connector.label}>
                      <p className="text-xs text-zinc-600">{connector.scope}</p>
                      <div className="mt-3 flex justify-between">
                        <StatusPill status={connector.id === 'storage' ? 'not_connected' : 'connected'} />
                        <SketchButton>{connector.id === 'storage' ? 'Connect' : 'Test'}</SketchButton>
                      </div>
                    </WireBox>
                  ))}
                </div>
              )}
              {step === 2 && (
                <div className="space-y-3">
                  {initialConnectors.map((connector) => (
                    <ConnectorRow key={connector.id} connector={connector} />
                  ))}
                </div>
              )}
              {step === 3 && (
                <div className="grid gap-4 lg:grid-cols-3">
                  <WireBox label="Webhook">
                    <div className="font-mono text-xs">charge.dispute.created</div>
                    <div className="mt-2 text-sm">$249.00 / fraudulent / due May 12</div>
                  </WireBox>
                  <WireBox label="Agent run">
                    <div className="space-y-2 text-xs">
                      <div>1. Pull Stripe charge/customer</div>
                      <div>2. Query customer usage</div>
                      <div>3. Generate packet</div>
                      <div>4. Submit evidence</div>
                    </div>
                  </WireBox>
                  <WireBox label="Notification">
                    <div className="text-sm">Slack: Evidence submitted for dp_3Qx9Kl2m.</div>
                  </WireBox>
                </div>
              )}
              {step === 4 && (
                <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                  <CaseTable cases={initialCases} selectedId="dp_3Qx9Kl2m" onSelect={() => undefined} />
                  <WireBox label="Outcome summary">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="border-2 border-zinc-950 p-3">$288 recovered</div>
                      <div className="border-2 border-zinc-950 p-3">47 sec avg response</div>
                      <div className="border-2 border-zinc-950 p-3">2 won</div>
                      <div className="border-2 border-zinc-950 p-3">0 broken access</div>
                    </div>
                  </WireBox>
                </div>
              )}
            </SketchPanel>

            <SketchPanel title="What this screen must prove">
              <ul className="space-y-3 text-sm">
                <li className={step === 0 ? 'font-semibold' : ''}>Can the founder finish setup without docs?</li>
                <li className={step === 1 ? 'font-semibold' : ''}>Are all accesses clearly scoped and read-only?</li>
                <li className={step === 2 ? 'font-semibold' : ''}>Can expired/broken credentials be refreshed?</li>
                <li className={step === 3 ? 'font-semibold' : ''}>Can the agent submit without human intervention?</li>
                <li className={step === 4 ? 'font-semibold' : ''}>Can the user trust the dashboard as source of truth?</li>
              </ul>
            </SketchPanel>
          </div>
        </div>
      </Shell>
    )
  },
}

type ConnectorAction =
  | { type: 'connect'; id: string }
  | { type: 'validate'; id: string }
  | { type: 'refresh'; id: string }
  | { type: 'expire'; id: string }
  | { type: 'fail'; id: string }

function connectorReducer(connectors: Connector[], action: ConnectorAction) {
  return connectors.map((connector) => {
    if (connector.id !== action.id) return connector
    if (action.type === 'connect' || action.type === 'refresh') {
      return { ...connector, status: 'connected' as const, lastRefresh: 'just now', nextRefresh: 'in 60 min' }
    }
    if (action.type === 'validate') return { ...connector, status: 'validating' as const }
    if (action.type === 'expire') return { ...connector, status: 'expired' as const, nextRefresh: 'now' }
    return { ...connector, status: 'failed' as const, nextRefresh: 'blocked' }
  })
}

export const AgentSetupAndAccessRefresh: Story = {
  name: 'Agent Setup + Access Refresh',
  render: () => {
    const [connectors, dispatch] = useReducer(connectorReducer, initialConnectors)
    const connectedCount = connectors.filter((item) => item.status === 'connected').length
    const readiness = Math.round((connectedCount / connectors.length) * 100)
    return (
      <Shell
        title="Agent setup and access refresh"
        subtitle="Mocked onboarding for Stripe, read-only systems, policies, and Slack/Telegram notification access."
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <SketchPanel title="Access checklist">
            {connectors.map((connector) => (
              <div key={connector.id} className="grid gap-3 border-b border-zinc-300 py-3 last:border-b-0 md:grid-cols-[1fr_auto]">
                <ConnectorRow
                  connector={connector}
                  onRefresh={() => dispatch({ type: 'refresh', id: connector.id })}
                  onBreak={() => dispatch({ type: 'fail', id: connector.id })}
                />
                <div className="flex gap-2 md:justify-end">
                  <SketchButton onClick={() => dispatch({ type: 'connect', id: connector.id })}>Connect</SketchButton>
                  <SketchButton onClick={() => dispatch({ type: 'expire', id: connector.id })}>Expire</SketchButton>
                </div>
              </div>
            ))}
          </SketchPanel>

          <div className="space-y-5">
            <SketchPanel title="Readiness">
              <div className="text-4xl font-semibold">{readiness}%</div>
              <div className="mt-3 h-5 border-2 border-zinc-950 bg-white">
                <div className="h-full bg-zinc-950" style={{ width: `${readiness}%` }} />
              </div>
              <p className="mt-3 text-sm text-zinc-600">
                Release rule: automated submission can be enabled when Stripe, DB, and at least one notification channel are connected.
              </p>
            </SketchPanel>
            <SketchPanel title="Policy/context capture">
              <div className="space-y-3 text-xs">
                <WireBox label="Product description">AI image generation workspace for paid subscribers.</WireBox>
                <WireBox label="Refund policy">Refunds available within 7 days before heavy usage.</WireBox>
                <WireBox label="Cancellation policy">Cancel anytime from account settings.</WireBox>
              </div>
            </SketchPanel>
          </div>
        </div>
      </Shell>
    )
  },
}

function nextCaseStatus(status: CaseStatus): CaseStatus {
  if (status === 'received') return 'investigating'
  if (status === 'investigating') return 'evidence_ready'
  if (status === 'evidence_ready') return 'submitted'
  if (status === 'submitted') return 'waiting'
  if (status === 'waiting') return 'won'
  return status
}

export const AutomatedSubmissionRun: Story = {
  name: 'Automated Submission Run',
  render: () => {
    const [status, setStatus] = useState<CaseStatus>('received')
    const timeline = timelineFor(status)
    return (
      <Shell
        title="Automated dispute submission"
        subtitle="A single case lifecycle: webhook in, evidence out, status monitored until Stripe outcome."
      >
        <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <SketchPanel title="Controls">
            <div className="flex flex-wrap gap-2">
              <SketchButton onClick={() => setStatus(nextCaseStatus(status))}>Advance run</SketchButton>
              <SketchButton onClick={() => setStatus('failed')}>DB failure</SketchButton>
              <SketchButton onClick={() => setStatus('lost')}>Mark lost</SketchButton>
              <SketchButton onClick={() => setStatus('received')}>Reset</SketchButton>
            </div>
            <div className="mt-5 border-2 border-zinc-950 p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">dp_3Qx9Kl2m</span>
                <StatusPill status={status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="border border-zinc-400 p-2">Amount: $249.00</div>
                <div className="border border-zinc-400 p-2">Reason: fraudulent</div>
                <div className="border border-zinc-400 p-2">Due: May 12</div>
                <div className="border border-zinc-400 p-2">Policy: auto-submit</div>
              </div>
            </div>
          </SketchPanel>

          <SketchPanel title="Agent timeline">
            <div className="space-y-4">
              {timeline.map((item) => (
                <div key={item.title} className="grid grid-cols-[70px_24px_1fr] gap-3">
                  <div className="font-mono text-xs text-zinc-500">{item.time}</div>
                  <div
                    className={`mt-1 h-5 w-5 border-2 border-zinc-950 ${
                      item.state === 'done'
                        ? 'bg-zinc-950'
                        : item.state === 'active'
                          ? 'bg-zinc-300'
                          : item.state === 'blocked'
                            ? 'bg-white ring-2 ring-zinc-950'
                            : 'bg-white'
                    }`}
                  />
                  <div>
                    <div className="text-sm font-semibold">{item.title}</div>
                    <p className="mt-1 text-xs text-zinc-600">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </SketchPanel>
        </div>
      </Shell>
    )
  },
}

export const MonitoringDashboard: Story = {
  name: 'Monitoring Dashboard',
  render: () => {
    const [selectedCaseId, setSelectedCaseId] = useState(initialCases[0].id)
    const [showBrokenAccess, setShowBrokenAccess] = useState(false)
    const selectedCase = initialCases.find((item) => item.id === selectedCaseId) ?? initialCases[0]
    const connectors = showBrokenAccess
      ? initialConnectors.map((item) => (item.id === 'database' ? { ...item, status: 'expired' as const } : item))
      : initialConnectors
    return (
      <Shell
        title="Monitoring dashboard"
        subtitle="The daily operator view: access health, automation status, active disputes, outcomes, and notification history."
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-4">
              <SketchPanel title="Open cases">
                <div className="text-3xl font-semibold">2</div>
              </SketchPanel>
              <SketchPanel title="Submitted">
                <div className="text-3xl font-semibold">11</div>
              </SketchPanel>
              <SketchPanel title="Won">
                <div className="text-3xl font-semibold">7</div>
              </SketchPanel>
              <SketchPanel title="Recovered">
                <div className="text-3xl font-semibold">$1.8k</div>
              </SketchPanel>
            </div>
            <SketchPanel title="Disputes">
              <CaseTable cases={initialCases} selectedId={selectedCaseId} onSelect={setSelectedCaseId} />
            </SketchPanel>
          </div>

          <div className="space-y-5">
            <SketchPanel title="Access health">
              <div className="mb-3">
                <SketchButton onClick={() => setShowBrokenAccess(!showBrokenAccess)}>
                  Toggle broken DB access
                </SketchButton>
              </div>
              {connectors.slice(0, 4).map((connector) => (
                <div key={connector.id} className="flex items-center justify-between border-b border-zinc-300 py-2 text-xs last:border-b-0">
                  <span>{connector.label}</span>
                  <StatusPill status={connector.status} />
                </div>
              ))}
            </SketchPanel>
            <SketchPanel title="Selected case">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">{selectedCase.id}</span>
                <StatusPill status={selectedCase.status} />
              </div>
              <p className="mt-3 text-sm">{selectedCase.customer}</p>
              <p className="text-xs text-zinc-600">
                {selectedCase.reason} / {selectedCase.amount} / due {selectedCase.due}
              </p>
              <div className="mt-4 border-2 border-dashed border-zinc-400 p-3 text-xs">
                Click-through should open Case Detail with evidence, packet, submission request id, and notifications.
              </div>
            </SketchPanel>
          </div>
        </div>
      </Shell>
    )
  },
}

export const CaseDetailAndEvidenceReview: Story = {
  name: 'Case Detail + Evidence Review',
  render: () => {
    const [tab, setTab] = useState<'summary' | 'evidence' | 'submission' | 'notifications'>('summary')
    const timeline = useMemo(() => timelineFor('submitted'), [])
    return (
      <Shell
        title="Case detail and status"
        subtitle="The trust screen: what happened, what evidence was used, what was submitted, and who was notified."
      >
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <SketchPanel title="Case">
            <div className="font-mono text-lg">dp_3Qx9Kl2m</div>
            <div className="mt-2 flex gap-2">
              <StatusPill status="submitted" />
              <span className="border border-zinc-950 px-2 py-0.5 text-[11px]">92/100 evidence</span>
            </div>
            <div className="mt-5 space-y-2 text-xs">
              <div>Customer: maria@acme.ai</div>
              <div>Amount: $249.00</div>
              <div>Reason: fraudulent</div>
              <div>Due: May 12</div>
              <div>Submission id: req_9af2</div>
              <div>Packet hash: pdf_7c21</div>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              {(['summary', 'evidence', 'submission', 'notifications'] as const).map((item) => (
                <SketchButton key={item} active={tab === item} onClick={() => setTab(item)}>
                  {item}
                </SketchButton>
              ))}
            </div>
          </SketchPanel>

          <SketchPanel title={tab}>
            {tab === 'summary' && (
              <div className="grid gap-5 lg:grid-cols-2">
                <WireBox label="Agent summary">
                  <p className="text-sm">
                    Riposte found strong proof that the cardholder received and used the product after purchase. Evidence was submitted automatically.
                  </p>
                </WireBox>
                <WireBox label="Timeline">
                  <div className="space-y-3">
                    {timeline.slice(0, 4).map((item) => (
                      <div key={item.title} className="text-xs">
                        <strong>{item.time}</strong> {item.title}
                      </div>
                    ))}
                  </div>
                </WireBox>
              </div>
            )}
            {tab === 'evidence' && (
              <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                <div className="space-y-2">
                  {evidenceFacts.map((fact) => (
                    <div key={fact} className="border-2 border-zinc-950 bg-zinc-50 p-3 text-sm">
                      {fact}
                    </div>
                  ))}
                </div>
                <WireBox label="PDF placeholder">
                  <div className="h-80 border-2 border-zinc-950 bg-white p-4">
                    <div className="h-6 w-40 bg-zinc-300" />
                    <div className="mt-6 space-y-2">
                      <div className="h-3 bg-zinc-200" />
                      <div className="h-3 bg-zinc-200" />
                      <div className="h-3 w-2/3 bg-zinc-200" />
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-2">
                      <div className="h-20 bg-zinc-200" />
                      <div className="h-20 bg-zinc-200" />
                    </div>
                  </div>
                </WireBox>
              </div>
            )}
            {tab === 'submission' && (
              <div className="space-y-4">
                {generatedStripeFields.map((field) => (
                  <WireBox key={field.label} label={field.label}>
                    <p className="text-sm">{field.value}</p>
                  </WireBox>
                ))}
              </div>
            )}
            {tab === 'notifications' && (
              <div className="space-y-3">
                <WireBox label="Slack">
                  <p className="text-sm">#chargebacks: Evidence submitted for dp_3Qx9Kl2m. Stripe request req_9af2.</p>
                </WireBox>
                <WireBox label="Telegram">
                  <p className="text-sm text-zinc-500">Not configured for this workspace.</p>
                </WireBox>
                <WireBox label="Email fallback">
                  <p className="text-sm">Skipped. Slack delivery confirmed.</p>
                </WireBox>
              </div>
            )}
          </SketchPanel>
        </div>
      </Shell>
    )
  },
}

export const FailureRecoveryFlow: Story = {
  name: 'Failure + Recovery Flow',
  render: () => {
    const [failure, setFailure] = useState<'db' | 'stripe' | 'slack' | 'weak_evidence'>('db')
    const failureCopy = {
      db: {
        title: 'Database credential expired',
        impact: 'Agent cannot gather app usage evidence. Auto-submit is paused for new cases.',
        fix: 'Refresh read-only DB token and rerun access check.',
      },
      stripe: {
        title: 'Stripe write scope missing',
        impact: 'Agent can build evidence but cannot submit it to Stripe.',
        fix: 'Reconnect Stripe with disputes.write scope.',
      },
      slack: {
        title: 'Slack notification failed',
        impact: 'Automation continues, but the founder may miss case updates.',
        fix: 'Reconnect Slack or enable Telegram fallback.',
      },
      weak_evidence: {
        title: 'Evidence below release threshold',
        impact: 'Agent found payment records but no product delivery proof.',
        fix: 'Map activity table or storage source before enabling auto-submit.',
      },
    }[failure]
    return (
      <Shell
        title="Failure and recovery"
        subtitle="Automation is only shippable if broken access, failed submissions, and weak evidence are visible and recoverable."
      >
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <SketchPanel title="Failure selector">
            <div className="flex flex-col gap-2">
              {(['db', 'stripe', 'slack', 'weak_evidence'] as const).map((item) => (
                <SketchButton key={item} active={failure === item} onClick={() => setFailure(item)}>
                  {item.replaceAll('_', ' ')}
                </SketchButton>
              ))}
            </div>
          </SketchPanel>
          <div className="grid gap-5 lg:grid-cols-2">
            <SketchPanel title="User-facing alert">
              <div className="border-4 border-zinc-950 bg-white p-5">
                <div className="text-lg font-semibold">{failureCopy.title}</div>
                <p className="mt-2 text-sm text-zinc-700">{failureCopy.impact}</p>
                <div className="mt-5 flex gap-2">
                  <SketchButton>Fix now</SketchButton>
                  <SketchButton>View affected cases</SketchButton>
                </div>
              </div>
            </SketchPanel>
            <SketchPanel title="Recovery checklist">
              <div className="space-y-3 text-sm">
                <div className="border-2 border-zinc-950 bg-zinc-950 p-3 text-white">1. Detect exact failed access or step</div>
                <div className="border-2 border-zinc-950 p-3">2. Explain business impact</div>
                <div className="border-2 border-zinc-950 p-3">3. Give one primary repair action</div>
                <div className="border-2 border-zinc-950 p-3">4. Re-run agent check and unblock queue</div>
              </div>
              <WireBox label="Recommended fix">
                <p className="text-sm">{failureCopy.fix}</p>
              </WireBox>
            </SketchPanel>
          </div>
        </div>
      </Shell>
    )
  },
}
