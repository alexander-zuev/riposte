import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'

const meta: Meta = {
  title: 'MVP Sketches/Riposte Founder Journey',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

type OperationalStatus = 'not_configured' | 'ready' | 'needs_input' | 'error'
type AgentStatus = 'not_configured' | 'configuring' | 'ready' | 'needs_input' | 'error'
type CaseStatus =
  | 'received'
  | 'collecting_evidence'
  | 'needs_input'
  | 'ready_for_review'
  | 'submitted'
  | 'accepted'
  | 'deadline_missed'
  | 'won'
  | 'lost'
  | 'failed'
type EvidenceQuality = 'high' | 'medium' | 'low'

type StateItem = {
  label: string
  status: OperationalStatus | AgentStatus
  detail: string
}

type CaseItem = {
  id: string
  customer: string
  amount: string
  reason: string
  due: string
  status: CaseStatus
  quality: EvidenceQuality
  action: string
}

const setupConnections: StateItem[] = [
  {
    label: 'Stripe connection',
    status: 'ready',
    detail: 'Disputes, charges, customers, invoices, files.',
  },
  {
    label: 'Postgres connection',
    status: 'ready',
    detail: 'Read-only role. Schema introspection passed.',
  },
  {
    label: 'Notifications',
    status: 'ready',
    detail: 'Telegram channel verified.',
  },
]

const evidenceTools: StateItem[] = [
  {
    label: 'find_customer',
    status: 'ready',
    detail: 'stripe_customer_id -> app user.',
  },
  {
    label: 'get_user_activity',
    status: 'ready',
    detail: 'sessions, outputs, downloads, last active.',
  },
  {
    label: 'get_delivered_outputs',
    status: 'needs_input',
    detail: 'Needs founder to confirm generated-output table.',
  },
]

const cases: CaseItem[] = [
  {
    id: 'dp_3Qx9Kl2m',
    customer: 'maria@acme.ai',
    amount: '$249.00',
    reason: 'fraudulent',
    due: 'May 12',
    status: 'submitted',
    quality: 'high',
    action: 'Submitted generated packet',
  },
  {
    id: 'dp_7Rm4Np8v',
    customer: 'lee@example.com',
    amount: '$89.00',
    reason: 'product_not_received',
    due: 'May 14',
    status: 'ready_for_review',
    quality: 'medium',
    action: 'Review packet',
  },
  {
    id: 'dp_2Wf6Bt3j',
    customer: 'founder@studio.dev',
    amount: '$399.00',
    reason: 'subscription_canceled',
    due: 'May 18',
    status: 'needs_input',
    quality: 'low',
    action: 'Fix policy context',
  },
  {
    id: 'dp_9Za1Qw0p',
    customer: 'ops@interior.test',
    amount: '$99.00',
    reason: 'product_not_received',
    due: 'closed',
    status: 'won',
    quality: 'high',
    action: 'Outcome tracked',
  },
]

const setupActivity = [
  {
    title: 'Stripe connected',
    body: 'Required dispute, charge, customer, invoice, and file permissions passed.',
    status: 'ready' as const,
  },
  {
    title: 'App database connected',
    body: 'Read-only Postgres role works. Schema introspection passed.',
    status: 'ready' as const,
  },
  {
    title: 'Customer matching saved',
    body: 'find_customer maps Stripe customer IDs to app users.',
    status: 'ready' as const,
  },
  {
    title: 'Usage evidence saved',
    body: 'get_user_activity returns sessions, exports, last active date, and account age.',
    status: 'ready' as const,
  },
  {
    title: 'One setup answer needed',
    body: 'Riposte needs the table or field that proves generated outputs were delivered.',
    status: 'needs_input' as const,
  },
]

const caseLog = [
  ['00:00', 'Stripe dispute received: product_not_received for $89.00.'],
  ['00:03', 'Customer matched to app user user_1842.'],
  ['00:09', 'Usage evidence found: 12 sessions, 4 exports, last active after charge.'],
  ['00:18', 'Generated service documentation PDF and Stripe text fields.'],
  ['00:19', 'Quality: medium. Review required before submit.'],
]

function formatStatus(status: string) {
  return status.replaceAll('_', ' ')
}

function statusTone(status: OperationalStatus | AgentStatus | CaseStatus | EvidenceQuality) {
  if (status === 'ready' || status === 'submitted' || status === 'won' || status === 'high') {
    return 'bg-zinc-950 text-white'
  }
  if (
    status === 'needs_input' ||
    status === 'ready_for_review' ||
    status === 'medium' ||
    status === 'configuring' ||
    status === 'collecting_evidence' ||
    status === 'received'
  ) {
    return 'bg-zinc-200 text-zinc-950'
  }
  if (
    status === 'error' ||
    status === 'failed' ||
    status === 'lost' ||
    status === 'deadline_missed' ||
    status === 'low'
  ) {
    return 'bg-white text-zinc-950 ring-2 ring-zinc-950'
  }
  return 'bg-white text-zinc-600 ring-1 ring-zinc-300'
}

function Pill({
  status,
}: {
  status: OperationalStatus | AgentStatus | CaseStatus | EvidenceQuality
}) {
  return (
    <span
      className={`inline-flex border border-zinc-950 px-2 py-0.5 text-[11px] font-medium capitalize ${statusTone(status)}`}
    >
      {formatStatus(status)}
    </span>
  )
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-100 p-6 text-zinc-950">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex items-end justify-between border-b-2 border-zinc-950 pb-3">
          <div>
            <div className="text-[11px] font-medium tracking-[0.24em] text-zinc-500 uppercase">
              Riposte pencil MVP
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-zinc-600">{subtitle}</p>
          </div>
          <div className="hidden border-2 border-zinc-950 bg-white px-3 py-2 text-xs md:block">
            v2 / spec-aligned
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}

function Panel({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`border-2 border-zinc-950 bg-white shadow-[5px_5px_0_#18181b] ${className}`}
    >
      <div className="border-b-2 border-zinc-950 px-4 py-2">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

function Button({
  children,
  active = false,
  onClick,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
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

function Box({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-2 border-dashed border-zinc-400 bg-zinc-50 p-3">
      <div className="text-[11px] font-medium tracking-[0.16em] text-zinc-500 uppercase">
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function StateRow({ item }: { item: StateItem }) {
  return (
    <div className="grid gap-2 border-b border-zinc-300 py-3 last:border-b-0 md:grid-cols-[1fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-sm">{item.label}</strong>
          <Pill status={item.status} />
        </div>
        <p className="mt-1 text-xs text-zinc-600">{item.detail}</p>
      </div>
      <Button>{item.status === 'ready' ? 'View' : 'Fix'}</Button>
    </div>
  )
}

function AgentSetupFeed() {
  return (
    <div className="space-y-4">
      <Box label="Setup goal">
        <div className="text-sm">
          Configure one product so Riposte can find the disputed customer, prove service delivery,
          generate an evidence packet, and submit according to policy.
        </div>
      </Box>
      <div className="space-y-3">
        {setupActivity.map((item) => (
          <div key={item.title} className="border-2 border-zinc-950 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm">{item.title}</strong>
              <Pill status={item.status} />
            </div>
            <p className="mt-2 text-xs text-zinc-600">{item.body}</p>
          </div>
        ))}
      </div>
      <div className="border-2 border-zinc-950 bg-zinc-50 p-4">
        <div className="text-sm font-semibold">Founder input</div>
        <p className="mt-1 text-xs text-zinc-600">
          The agent asks for missing context, but saved state remains structured.
        </p>
        <div className="mt-3 border border-zinc-300 bg-white p-3 text-sm">
          Generated outputs are in <strong>photos</strong>. Completed rows have{' '}
          <strong>status = done</strong>.
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button>Save answer</Button>
          <Button>Run dry test</Button>
        </div>
      </div>
    </div>
  )
}

function SurfaceMap({ active }: { active: string }) {
  const surfaces = [
    ['/dashboard', 'Control room'],
    ['/setup', 'Setup'],
    ['/disputes', 'Disputes'],
    ['/disputes/:id', 'Case detail'],
    ['/billing', 'Billing'],
    ['/settings', 'Settings'],
  ]

  return (
    <div className="grid gap-2 text-xs md:grid-cols-6">
      {surfaces.map(([route, label]) => (
        <div
          key={route}
          className={`border-2 border-zinc-950 p-2 ${
            route === active ? 'bg-zinc-950 text-white' : 'bg-white'
          }`}
        >
          <div className="font-mono">{route}</div>
          <div className="mt-1">{label}</div>
        </div>
      ))}
    </div>
  )
}

function CaseTable({ selected, onSelect }: { selected?: string; onSelect: (id: string) => void }) {
  return (
    <div className="overflow-hidden border-2 border-zinc-950">
      <table className="w-full text-left text-xs">
        <thead className="bg-zinc-200">
          <tr className="border-b-2 border-zinc-950">
            <th className="px-3 py-2">Case</th>
            <th className="px-3 py-2">Customer</th>
            <th className="px-3 py-2">Amount</th>
            <th className="px-3 py-2">Reason</th>
            <th className="px-3 py-2">Due</th>
            <th className="px-3 py-2">Quality</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Next action</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`cursor-pointer border-b border-zinc-300 last:border-b-0 ${
                selected === item.id ? 'bg-zinc-100 outline outline-2 outline-zinc-950' : 'bg-white'
              }`}
            >
              <td className="px-3 py-2 font-mono">{item.id}</td>
              <td className="px-3 py-2">{item.customer}</td>
              <td className="px-3 py-2">{item.amount}</td>
              <td className="px-3 py-2">{item.reason}</td>
              <td className="px-3 py-2">{item.due}</td>
              <td className="px-3 py-2">
                <Pill status={item.quality} />
              </td>
              <td className="px-3 py-2">
                <Pill status={item.status} />
              </td>
              <td className="px-3 py-2">{item.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PacketPreview() {
  return (
    <div className="border-2 border-zinc-950 bg-white p-4">
      <div className="mx-auto min-h-[420px] max-w-sm border border-zinc-300 bg-white p-5 shadow-sm">
        <div className="text-center text-lg font-semibold">Service Documentation</div>
        <div className="mt-2 text-center text-xs text-zinc-500">Generated by Riposte</div>
        <div className="mt-6 space-y-3 text-xs">
          <div className="h-4 bg-zinc-200" />
          <div className="h-4 w-4/5 bg-zinc-200" />
          <div className="h-4 w-2/3 bg-zinc-200" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <div className="h-20 bg-zinc-200" />
          <div className="h-20 bg-zinc-200" />
        </div>
        <div className="mt-6 h-24 border border-zinc-300 bg-zinc-100" />
      </div>
    </div>
  )
}

export const ControlRoom: Story = {
  name: '1. Control Room',
  render: () => {
    const [selected, setSelected] = useState(cases[1].id)
    const selectedCase = cases.find((item) => item.id === selected) ?? cases[1]

    return (
      <Shell
        title="Control room"
        subtitle="Home shows setup health, urgent cases, recent outcomes, and the next useful action. It is not a separate onboarding product."
      >
        <div className="mb-5">
          <SurfaceMap active="/dashboard" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-4">
              <Panel title="At risk">
                <div className="text-3xl font-semibold">$488</div>
              </Panel>
              <Panel title="Needs review">
                <div className="text-3xl font-semibold">1</div>
              </Panel>
              <Panel title="Needs input">
                <div className="text-3xl font-semibold">1</div>
              </Panel>
              <Panel title="Recovered">
                <div className="text-3xl font-semibold">$1.8k</div>
              </Panel>
            </div>
            <Panel title="Dispute cases">
              <CaseTable selected={selected} onSelect={setSelected} />
            </Panel>
          </div>
          <div className="space-y-5">
            <Panel title="Next action">
              <div className="flex items-center gap-2">
                <Pill status={selectedCase.status} />
                <Pill status={selectedCase.quality} />
              </div>
              <p className="mt-3 text-sm">{selectedCase.action}</p>
              <p className="mt-2 text-xs text-zinc-600">
                {selectedCase.id} / {selectedCase.customer} / due {selectedCase.due}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button>Open case</Button>
                <Button>Stripe dashboard</Button>
              </div>
            </Panel>
            <Panel title="Setup state">
              <StateRow
                item={{
                  label: 'Riposte agent',
                  status: 'ready',
                  detail: 'Dry run passed. Auto-submit limited to high-quality packets.',
                }}
              />
              {setupConnections.map((item) => (
                <StateRow key={item.label} item={item} />
              ))}
            </Panel>
          </div>
        </div>
      </Shell>
    )
  },
}

export const AgentDrivenSetup: Story = {
  name: '2. Agent Setup',
  render: () => (
    <Shell
      title="Setup is agent-driven"
      subtitle="The agent handles variable product context, but durable state stays structured: connections, evidence tools, dry run, policy, billing."
    >
      <div className="mb-5">
        <SurfaceMap active="/setup" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <Panel title="Setup workspace">
          <AgentSetupFeed />
        </Panel>
        <div className="space-y-5">
          <Panel title="Durable setup state">
            <StateRow
              item={{
                label: 'Riposte agent',
                status: 'configuring',
                detail: 'Waiting for delivered-output mapping before dry run can pass.',
              }}
            />
            {setupConnections.map((item) => (
              <StateRow key={item.label} item={item} />
            ))}
          </Panel>
          <Panel title="Evidence tools">
            {evidenceTools.map((item) => (
              <StateRow key={item.label} item={item} />
            ))}
          </Panel>
          <Panel title="Launch gates">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border border-zinc-300 p-2">
                <span>Initial Stripe sync</span>
                <span>440 disputes imported</span>
              </div>
              <div className="flex justify-between border border-zinc-300 p-2">
                <span>Submission policy</span>
                <span>review before submit</span>
              </div>
              <div className="flex justify-between border border-zinc-300 p-2">
                <span>Billing</span>
                <span>not configured</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </Shell>
  ),
}

export const DisputeInbox: Story = {
  name: '3. Dispute Inbox',
  render: () => {
    const [selected, setSelected] = useState(cases[0].id)

    return (
      <Shell
        title="Dispute inbox"
        subtitle="The list is operational: current case state, evidence quality, deadline, and next action."
      >
        <div className="mb-5">
          <SurfaceMap active="/disputes" />
        </div>
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-5">
            <Panel title="Pending">
              <div className="text-3xl font-semibold">2</div>
            </Panel>
            <Panel title="Submitted">
              <div className="text-3xl font-semibold">11</div>
            </Panel>
            <Panel title="Won">
              <div className="text-3xl font-semibold">7</div>
            </Panel>
            <Panel title="Lost">
              <div className="text-3xl font-semibold">3</div>
            </Panel>
            <Panel title="Deadline missed">
              <div className="text-3xl font-semibold">0</div>
            </Panel>
          </div>
          <Panel title="Cases">
            <CaseTable selected={selected} onSelect={setSelected} />
          </Panel>
        </div>
      </Shell>
    )
  },
}

export const CaseReviewAndManualEscapeHatch: Story = {
  name: '4. Case Review + Manual Escape Hatch',
  render: () => {
    const [mode, setMode] = useState<'review' | 'needs_input' | 'submitted'>('review')
    const status: CaseStatus =
      mode === 'submitted'
        ? 'submitted'
        : mode === 'needs_input'
          ? 'needs_input'
          : 'ready_for_review'
    const quality: EvidenceQuality =
      mode === 'needs_input' ? 'low' : mode === 'review' ? 'medium' : 'high'
    const log = useMemo(
      () =>
        mode === 'needs_input'
          ? [
              ['00:00', 'Stripe dispute received.'],
              ['00:04', 'Customer matched to app user.'],
              ['00:12', 'Delivery proof missing. get_delivered_outputs needs setup input.'],
            ]
          : caseLog,
      [mode],
    )

    return (
      <Shell
        title="Case detail"
        subtitle="Review is not an editor. The founder can approve, accept, download/copy, or upload a final PDF override."
      >
        <div className="mb-5">
          <SurfaceMap active="/disputes/:id" />
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          <Button active={mode === 'review'} onClick={() => setMode('review')}>
            Ready for review
          </Button>
          <Button active={mode === 'needs_input'} onClick={() => setMode('needs_input')}>
            Needs input
          </Button>
          <Button active={mode === 'submitted'} onClick={() => setMode('submitted')}>
            Submitted
          </Button>
        </div>
        <div className="grid gap-5 lg:grid-cols-[320px_1fr_360px]">
          <Panel title="Case dp_7Rm4Np8v">
            <div className="flex flex-wrap gap-2">
              <Pill status={status} />
              <Pill status={quality} />
            </div>
            <div className="mt-5 space-y-2 text-xs">
              <div>Customer: lee@example.com</div>
              <div>Amount: $89.00</div>
              <div>Reason: product_not_received</div>
              <div>Deadline: May 14</div>
              <div>Response: {mode === 'submitted' ? 'challenge_submitted' : 'none'}</div>
            </div>
            <div className="mt-5 space-y-2">
              <Button>Open Stripe dispute</Button>
              <Button>View source facts</Button>
            </div>
          </Panel>
          <Panel title="Evidence packet">
            <PacketPreview />
          </Panel>
          <div className="space-y-5">
            <Panel title="Actions">
              {mode === 'needs_input' ? (
                <div className="space-y-3 text-sm">
                  <Box label="Required input">
                    Confirm where delivered outputs live before Riposte can produce a source-backed
                    packet.
                  </Box>
                  <Button>Open setup input</Button>
                  <Button>Accept / close dispute</Button>
                </div>
              ) : mode === 'submitted' ? (
                <div className="space-y-3 text-sm">
                  <Box label="Submitted">
                    Evidence was submitted to Stripe using the generated packet.
                  </Box>
                  <Button>Open Stripe request</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button>Approve submit</Button>
                  <Button>Accept / close dispute</Button>
                  <Button>Download PDF</Button>
                  <Button>Download DOCX</Button>
                  <Button>Copy Stripe text fields</Button>
                  <Button>Upload final PDF override</Button>
                </div>
              )}
            </Panel>
            <Panel title="Agent log">
              <div className="space-y-2">
                {log.map(([time, text]) => (
                  <div key={`${time}-${text}`} className="grid grid-cols-[54px_1fr] gap-3 text-xs">
                    <span className="font-mono text-zinc-500">{time}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </Shell>
    )
  },
}

export const ConnectionAndToolFailure: Story = {
  name: '5. Settings / Failure States',
  render: () => {
    const [failure, setFailure] = useState<'connection' | 'tool' | 'quality'>('tool')
    const copy = {
      connection: {
        title: 'Connection needs input',
        status: 'needs_input' as const,
        body: 'Postgres credentials are invalid. Riposte cannot access app data until founder fixes the connection.',
        owner: 'Connection',
      },
      tool: {
        title: 'Evidence tool error',
        status: 'error' as const,
        body: 'get_user_activity failed because the mapped column no longer exists. The DB connection itself is still ready.',
        owner: 'EvidenceTool',
      },
      quality: {
        title: 'Low quality packet',
        status: 'needs_input' as const,
        body: 'Stripe/payment data exists, but delivery proof is missing. The case cannot auto-submit.',
        owner: 'DisputeCase',
      },
    }[failure]

    return (
      <Shell
        title="Failures are separated by ownership"
        subtitle="Settings explains what is broken without mixing credentials, evidence tools, and case state."
      >
        <div className="mb-5">
          <SurfaceMap active="/settings" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <Panel title="Scenario">
            <div className="flex flex-col gap-2">
              <Button active={failure === 'connection'} onClick={() => setFailure('connection')}>
                Connection
              </Button>
              <Button active={failure === 'tool'} onClick={() => setFailure('tool')}>
                Evidence tool
              </Button>
              <Button active={failure === 'quality'} onClick={() => setFailure('quality')}>
                Low quality
              </Button>
            </div>
          </Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title={copy.title}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{copy.owner}</span>
                <Pill status={copy.status} />
              </div>
              <p className="mt-4 text-sm text-zinc-700">{copy.body}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button>Notify founder</Button>
                <Button>Show affected cases</Button>
              </div>
            </Panel>
            <Panel title="What changes">
              <div className="space-y-3 text-sm">
                <Box label="Connection">Only credentials/config/permissions live here.</Box>
                <Box label="EvidenceTool">Saved SQL/API mapping and validation live here.</Box>
                <Box label="DisputeCase">
                  Case moves to needs_input, ready_for_review, submitted, accepted, or failed.
                </Box>
              </div>
            </Panel>
          </div>
        </div>
      </Shell>
    )
  },
}

export const BillingGate: Story = {
  name: '6. Billing Gate',
  render: () => {
    const [paid, setPaid] = useState(false)

    return (
      <Shell
        title="Billing gates live submission"
        subtitle="Riposte can collect and preview evidence before billing, but live submission/autopilot requires payment."
      >
        <div className="mb-5">
          <SurfaceMap active="/billing" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <Panel title="Plan">
            <div className="grid gap-4 md:grid-cols-3">
              <Box label="Current plan">
                <div className="text-2xl font-semibold">{paid ? 'Active' : 'Not configured'}</div>
              </Box>
              <Box label="Recovered">
                <div className="text-2xl font-semibold">$1.8k</div>
              </Box>
              <Box label="At risk">
                <div className="text-2xl font-semibold">$488</div>
              </Box>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between border border-zinc-300 p-3">
                <span>Evidence preview</span>
                <Pill status="ready" />
              </div>
              <div className="flex items-center justify-between border border-zinc-300 p-3">
                <span>Manual download/copy</span>
                <Pill status="ready" />
              </div>
              <div className="flex items-center justify-between border border-zinc-300 p-3">
                <span>Live Stripe submission</span>
                <Pill status={paid ? 'ready' : 'not_configured'} />
              </div>
            </div>
          </Panel>
          <Panel title="Payment method">
            <Box label={paid ? 'Gate open' : 'Gate closed'}>
              {paid
                ? 'Autopilot and founder-approved submissions can run.'
                : 'Add payment before Riposte submits evidence to Stripe.'}
            </Box>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button active={paid} onClick={() => setPaid(true)}>
                Mark paid
              </Button>
              <Button active={!paid} onClick={() => setPaid(false)}>
                Mark unpaid
              </Button>
            </div>
          </Panel>
        </div>
      </Shell>
    )
  },
}
