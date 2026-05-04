import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo, useReducer, useState } from 'react'

const meta: Meta = {
  title: 'MVP Sketches/Riposte Founder Journey',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

type AccessStatus = 'empty' | 'checking' | 'ready' | 'broken' | 'optional'
type TestStatus = 'not_run' | 'running' | 'passed' | 'failed'
type AutopilotStatus = 'off' | 'payment_required' | 'live' | 'paused'
type CaseStatus = 'new' | 'investigating' | 'submitted' | 'waiting' | 'won' | 'lost' | 'blocked'

type AccessItem = {
  id: 'stripe' | 'database' | 'evidence' | 'policies' | 'notifications' | 'billing'
  title: string
  why: string
  scope: string
  status: AccessStatus
  required: boolean
}

type CaseItem = {
  id: string
  customer: string
  amount: string
  reason: string
  due: string
  status: CaseStatus
  evidence: number
}

type SetupState = {
  access: AccessItem[]
  test: TestStatus
  autopilot: AutopilotStatus
}

type SetupAction =
  | { type: 'connect'; id: AccessItem['id'] }
  | { type: 'break'; id: AccessItem['id'] }
  | { type: 'run-test' }
  | { type: 'pass-test' }
  | { type: 'fail-test' }
  | { type: 'add-payment' }
  | { type: 'enable-autopilot' }
  | { type: 'pause-autopilot' }
  | { type: 'reset' }

const emptyAccess: AccessItem[] = [
  {
    id: 'stripe',
    title: 'Stripe',
    why: 'Receive disputes, read charge/customer data, submit evidence.',
    scope: 'Restricted key or OAuth: disputes, charges, customers.',
    status: 'empty',
    required: true,
  },
  {
    id: 'database',
    title: 'Read-only app data',
    why: 'Find proof that the customer used the product.',
    scope: 'Read-only SQL role. No writes, no schema changes.',
    status: 'empty',
    required: true,
  },
  {
    id: 'evidence',
    title: 'Evidence files',
    why: 'Pull screenshots, invoices, generated outputs, course progress, exports.',
    scope: 'Read-only storage bucket or signed file access.',
    status: 'optional',
    required: false,
  },
  {
    id: 'policies',
    title: 'Product + policies',
    why: 'Explain what was sold and what refund/cancellation terms applied.',
    scope: 'Plain text + policy links/PDFs + checkout screenshot.',
    status: 'empty',
    required: true,
  },
  {
    id: 'notifications',
    title: 'Slack / Telegram',
    why: 'Tell the founder when disputes are handled or automation breaks.',
    scope: 'Post to one selected channel.',
    status: 'empty',
    required: true,
  },
  {
    id: 'billing',
    title: 'Payment method',
    why: 'Required before Riposte can run on autopilot.',
    scope: 'Stripe Billing customer + payment method.',
    status: 'empty',
    required: true,
  },
]

const liveAccess: AccessItem[] = emptyAccess.map((item) => ({
  ...item,
  status: item.id === 'evidence' ? 'optional' : 'ready',
}))

const cases: CaseItem[] = [
  {
    id: 'dp_3Qx9Kl2m',
    customer: 'maria@acme.ai',
    amount: '$249.00',
    reason: 'fraudulent',
    due: 'May 12',
    status: 'submitted',
    evidence: 92,
  },
  {
    id: 'dp_7Rm4Np8v',
    customer: 'lee@example.com',
    amount: '$89.00',
    reason: 'product_not_received',
    due: 'May 14',
    status: 'investigating',
    evidence: 74,
  },
  {
    id: 'dp_2Wf6Bt3j',
    customer: 'founder@studio.dev',
    amount: '$39.00',
    reason: 'subscription_canceled',
    due: 'May 18',
    status: 'won',
    evidence: 86,
  },
]

const testSteps = [
  'Fetch recent Stripe charge and customer',
  'Match customer to app account',
  'Query usage/events with read-only DB role',
  'Assemble timeline and Stripe evidence fields',
  'Render sample PDF packet',
  'Send Slack/Telegram test notification',
]

const evidenceFacts = [
  'Customer created account after successful payment',
  '37 authenticated sessions from same device family',
  '184 product outputs generated after purchase',
  '16 exports/downloads completed',
  'No refund request or support ticket before dispute',
  'Checkout IP matches later login IP range',
]

function setupReducer(state: SetupState, action: SetupAction): SetupState {
  if (action.type === 'reset') return { access: emptyAccess, test: 'not_run', autopilot: 'off' }
  if (action.type === 'run-test') return { ...state, test: 'running' }
  if (action.type === 'pass-test')
    return { ...state, test: 'passed', autopilot: 'payment_required' }
  if (action.type === 'fail-test') return { ...state, test: 'failed', autopilot: 'off' }
  if (action.type === 'add-payment') {
    return {
      ...state,
      access: state.access.map((item) =>
        item.id === 'billing' ? { ...item, status: 'ready' as const } : item,
      ),
    }
  }
  if (action.type === 'enable-autopilot') return { ...state, autopilot: 'live' }
  if (action.type === 'pause-autopilot') return { ...state, autopilot: 'paused' }

  return {
    ...state,
    access: state.access.map((item) => {
      if (item.id !== action.id) return item
      return { ...item, status: action.type === 'connect' ? 'ready' : 'broken' }
    }),
    autopilot: action.type === 'break' ? 'paused' : state.autopilot,
  }
}

function statusText(status: AccessStatus | TestStatus | AutopilotStatus | CaseStatus) {
  return status.replaceAll('_', ' ')
}

function tone(status: AccessStatus | TestStatus | AutopilotStatus | CaseStatus) {
  if (
    status === 'ready' ||
    status === 'passed' ||
    status === 'live' ||
    status === 'won' ||
    status === 'submitted'
  ) {
    return 'bg-zinc-950 text-white'
  }
  if (
    status === 'broken' ||
    status === 'failed' ||
    status === 'paused' ||
    status === 'lost' ||
    status === 'blocked'
  ) {
    return 'bg-white text-zinc-950 ring-2 ring-zinc-950'
  }
  if (
    status === 'checking' ||
    status === 'running' ||
    status === 'payment_required' ||
    status === 'investigating'
  ) {
    return 'bg-zinc-300 text-zinc-950'
  }
  return 'bg-white text-zinc-600 ring-1 ring-zinc-300'
}

function Pill({ status }: { status: AccessStatus | TestStatus | AutopilotStatus | CaseStatus }) {
  return (
    <span
      className={`inline-flex border border-zinc-950 px-2 py-0.5 text-[11px] font-medium capitalize ${tone(status)}`}
    >
      {statusText(status)}
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
  children: React.ReactNode
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
            1000ft / mocked logic
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
  children: React.ReactNode
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
  children: React.ReactNode
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

function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-2 border-dashed border-zinc-400 bg-zinc-50 p-3">
      <div className="text-[11px] font-medium tracking-[0.16em] text-zinc-500 uppercase">
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function AccessRow({
  item,
  onConnect,
  onBreak,
}: {
  item: AccessItem
  onConnect?: () => void
  onBreak?: () => void
}) {
  return (
    <div className="grid gap-3 border-b border-zinc-300 py-3 last:border-b-0 md:grid-cols-[1fr_auto]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-sm">{item.title}</strong>
          <Pill status={item.status} />
          {!item.required && <span className="text-[11px] text-zinc-500">optional for MVP</span>}
        </div>
        <p className="mt-1 text-xs text-zinc-600">{item.why}</p>
        <p className="mt-1 font-mono text-[11px] text-zinc-500">{item.scope}</p>
      </div>
      <div className="flex gap-2 md:justify-end">
        <Button onClick={onConnect}>{item.status === 'ready' ? 'Re-test' : 'Connect'}</Button>
        <Button onClick={onBreak}>Break</Button>
      </div>
    </div>
  )
}

function AutopilotCard({ state }: { state: SetupState }) {
  const requiredReady = state.access
    .filter((item) => item.required)
    .every((item) => item.status === 'ready')
  const canEnable =
    requiredReady && state.test === 'passed' && state.autopilot !== 'payment_required'
  const message =
    state.autopilot === 'live'
      ? 'Riposte is listening for Stripe disputes and will submit evidence automatically.'
      : state.autopilot === 'paused'
        ? 'Autopilot is paused because a required system needs attention.'
        : state.autopilot === 'payment_required'
          ? 'Setup test passed. Add payment to enable live dispute protection.'
          : 'Riposte is not active yet. Finish setup and run a test.'

  return (
    <Panel title="Autopilot control">
      <div className="flex items-center justify-between">
        <div className="text-3xl font-semibold">{state.autopilot === 'live' ? 'ON' : 'OFF'}</div>
        <Pill status={state.autopilot} />
      </div>
      <p className="mt-3 text-sm text-zinc-600">{message}</p>
      <div className="mt-4 grid gap-2 text-xs">
        <div className="flex justify-between border border-zinc-300 p-2">
          <span>Required systems</span>
          <span>{requiredReady ? 'ready' : 'incomplete'}</span>
        </div>
        <div className="flex justify-between border border-zinc-300 p-2">
          <span>Setup test</span>
          <span>{statusText(state.test)}</span>
        </div>
        <div className="flex justify-between border border-zinc-300 p-2">
          <span>Can enable</span>
          <span>{canEnable ? 'yes' : 'no'}</span>
        </div>
      </div>
    </Panel>
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
            <th className="px-3 py-2">Evidence</th>
            <th className="px-3 py-2">Status</th>
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
              <td className="px-3 py-2">{item.evidence}/100</td>
              <td className="px-3 py-2">
                <Pill status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const initialState: SetupState = {
  access: emptyAccess,
  test: 'not_run',
  autopilot: 'off',
}

export const FirstLoginControlRoom: Story = {
  name: '1. First Login Control Room',
  render: () => {
    const [mode, setMode] = useState<'empty' | 'partial' | 'live'>('empty')
    const state =
      mode === 'live'
        ? { access: liveAccess, test: 'passed' as const, autopilot: 'live' as const }
        : mode === 'partial'
          ? {
              access: emptyAccess.map((item) =>
                item.id === 'stripe' || item.id === 'database'
                  ? { ...item, status: 'ready' as const }
                  : item,
              ),
              test: 'not_run' as const,
              autopilot: 'off' as const,
            }
          : initialState

    return (
      <Shell
        title="Home is the control room"
        subtitle="A new user does not land in a separate onboarding product. They see the live operations room, empty until Riposte is configured."
      >
        <div className="mb-5 flex flex-wrap gap-2">
          <Button active={mode === 'empty'} onClick={() => setMode('empty')}>
            New account
          </Button>
          <Button active={mode === 'partial'} onClick={() => setMode('partial')}>
            Half setup
          </Button>
          <Button active={mode === 'live'} onClick={() => setMode('live')}>
            Autopilot live
          </Button>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-4">
              <Panel title="Autopilot">
                <div className="text-3xl font-semibold">
                  {state.autopilot === 'live' ? 'ON' : 'OFF'}
                </div>
              </Panel>
              <Panel title="Systems ready">
                <div className="text-3xl font-semibold">
                  {state.access.filter((item) => item.status === 'ready').length}/
                  {state.access.length}
                </div>
              </Panel>
              <Panel title="Open disputes">
                <div className="text-3xl font-semibold">{mode === 'live' ? '2' : '0'}</div>
              </Panel>
              <Panel title="Recovered">
                <div className="text-3xl font-semibold">{mode === 'live' ? '$1.8k' : '$0'}</div>
              </Panel>
            </div>
            <Panel title={mode === 'live' ? 'Recent dispute activity' : 'Empty state'}>
              {mode === 'live' ? (
                <CaseTable selected="dp_3Qx9Kl2m" onSelect={() => undefined} />
              ) : (
                <div className="grid gap-4 md:grid-cols-[1fr_280px]">
                  <Box label="Main message">
                    <div className="text-lg font-semibold">
                      Riposte is not protecting disputes yet.
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">
                      Connect Stripe, read-only app data, policies, and notifications. Then run a
                      dry test and enable autopilot.
                    </p>
                    <div className="mt-4">
                      <Button>Set up Riposte</Button>
                    </div>
                  </Box>
                  <Box label="What happens after setup">
                    <div className="space-y-2 text-sm">
                      <div>1. Stripe webhook received</div>
                      <div>2. Agent gathers usage proof</div>
                      <div>3. Evidence submitted automatically</div>
                      <div>4. Founder notified</div>
                    </div>
                  </Box>
                </div>
              )}
            </Panel>
          </div>
          <AutopilotCard state={state} />
        </div>
      </Shell>
    )
  },
}

export const ConnectSystemsAndContext: Story = {
  name: '2. Connect Systems + Context',
  render: () => {
    const [state, dispatch] = useReducer(setupReducer, initialState)
    const readyRequired = state.access.filter(
      (item) => item.required && item.status === 'ready',
    ).length
    const totalRequired = state.access.filter((item) => item.required).length

    return (
      <Shell
        title="Connect everything Riposte needs"
        subtitle="The setup flow is about trust: what access is required, why it exists, what scope it has, and whether it blocks autopilot."
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <Panel title="Required setup checklist">
            {state.access.map((item) => (
              <AccessRow
                key={item.id}
                item={item}
                onConnect={() => dispatch({ type: 'connect', id: item.id })}
                onBreak={() => dispatch({ type: 'break', id: item.id })}
              />
            ))}
          </Panel>
          <div className="space-y-5">
            <Panel title="Setup readiness">
              <div className="text-4xl font-semibold">
                {readyRequired}/{totalRequired}
              </div>
              <p className="mt-2 text-sm text-zinc-600">Required systems connected.</p>
              <div className="mt-4 h-5 border-2 border-zinc-950 bg-white">
                <div
                  className="h-full bg-zinc-950"
                  style={{ width: `${Math.round((readyRequired / totalRequired) * 100)}%` }}
                />
              </div>
            </Panel>
            <Panel title="What we need to show">
              <ul className="space-y-2 text-sm">
                <li>Every credential is scoped and explainable.</li>
                <li>Read-only access is explicit for customer systems.</li>
                <li>Missing required items block the setup test.</li>
                <li>Optional evidence storage can be skipped for launch.</li>
              </ul>
            </Panel>
          </div>
        </div>
      </Shell>
    )
  },
}

export const SetupTestAndBillingGate: Story = {
  name: '3. Test Run + Billing Gate',
  render: () => {
    const [state, dispatch] = useReducer(setupReducer, {
      access: liveAccess.map((item) =>
        item.id === 'billing' ? { ...item, status: 'empty' } : item,
      ),
      test: 'not_run',
      autopilot: 'off',
    })
    const paymentReady = state.access.find((item) => item.id === 'billing')?.status === 'ready'

    return (
      <Shell
        title="Dry test before autopilot"
        subtitle="The founder should see Riposte work before paying for live automation. Payment gates the final switch, not the proof."
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <Panel title="Setup test run">
            <div className="mb-4 flex flex-wrap gap-2">
              <Button onClick={() => dispatch({ type: 'run-test' })}>Run test</Button>
              <Button onClick={() => dispatch({ type: 'pass-test' })}>Pass test</Button>
              <Button onClick={() => dispatch({ type: 'fail-test' })}>Fail test</Button>
            </div>
            <div className="mb-4 flex items-center gap-2">
              <strong className="text-sm">Test status</strong>
              <Pill status={state.test} />
            </div>
            <div className="space-y-3">
              {testSteps.map((step, index) => {
                const active = state.test === 'running' && index < 3
                const done = state.test === 'passed' || active
                const blocked = state.test === 'failed' && index === 2
                return (
                  <div key={step} className="grid grid-cols-[28px_1fr] gap-3">
                    <div
                      className={`mt-0.5 h-5 w-5 border-2 border-zinc-950 ${
                        done
                          ? 'bg-zinc-950'
                          : blocked
                            ? 'bg-white ring-2 ring-zinc-950'
                            : 'bg-white'
                      }`}
                    />
                    <div>
                      <div className="text-sm font-semibold">{step}</div>
                      <p className="text-xs text-zinc-600">
                        {blocked
                          ? 'Example failure: usage_events table mapping is missing.'
                          : 'Mocked check with visible pass/fail result.'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
          <div className="space-y-5">
            <Panel title="Sample evidence output">
              <Box label="Packet preview">
                <div className="h-64 border-2 border-zinc-950 bg-white p-4">
                  <div className="h-5 w-44 bg-zinc-300" />
                  <div className="mt-5 space-y-2">
                    <div className="h-3 bg-zinc-200" />
                    <div className="h-3 bg-zinc-200" />
                    <div className="h-3 w-2/3 bg-zinc-200" />
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-2">
                    <div className="h-16 bg-zinc-200" />
                    <div className="h-16 bg-zinc-200" />
                  </div>
                </div>
              </Box>
            </Panel>
            <Panel title="Billing gate">
              <div className="flex items-center justify-between">
                <strong className="text-sm">Payment method</strong>
                <Pill status={paymentReady ? 'ready' : 'empty'} />
              </div>
              <p className="mt-3 text-sm text-zinc-600">
                Show this after a passed test: “Autopilot is ready. Add billing to start protecting
                live disputes.”
              </p>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => dispatch({ type: 'add-payment' })}>Add payment</Button>
                <Button onClick={() => dispatch({ type: 'enable-autopilot' })}>
                  Enable autopilot
                </Button>
              </div>
              <div className="mt-4">
                <AutopilotCard state={state} />
              </div>
            </Panel>
          </div>
        </div>
      </Shell>
    )
  },
}

export const LiveAutopilotAndMonitoring: Story = {
  name: '4. Live Autopilot + Metrics',
  render: () => {
    const [selected, setSelected] = useState(cases[0].id)
    const [broken, setBroken] = useState(false)
    const selectedCase = cases.find((item) => item.id === selected) ?? cases[0]
    const state: SetupState = {
      access: liveAccess.map((item) =>
        broken && item.id === 'database' ? { ...item, status: 'broken' } : item,
      ),
      test: 'passed',
      autopilot: broken ? 'paused' : 'live',
    }

    return (
      <Shell
        title="Live control room"
        subtitle="After setup, the home page becomes the operational dashboard: autopilot state, health, active disputes, metrics, and recent outcomes."
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-4">
              <Panel title="Submitted">
                <div className="text-3xl font-semibold">11</div>
              </Panel>
              <Panel title="Won">
                <div className="text-3xl font-semibold">7</div>
              </Panel>
              <Panel title="Recovered">
                <div className="text-3xl font-semibold">$1.8k</div>
              </Panel>
              <Panel title="Avg response">
                <div className="text-3xl font-semibold">47s</div>
              </Panel>
            </div>
            <Panel title="Cases">
              <CaseTable selected={selected} onSelect={setSelected} />
            </Panel>
          </div>
          <div className="space-y-5">
            <AutopilotCard state={state} />
            <Panel title="Health + alerts">
              <div className="mb-3">
                <Button onClick={() => setBroken(!broken)}>Toggle broken DB access</Button>
              </div>
              {state.access.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-zinc-300 py-2 text-xs last:border-b-0"
                >
                  <span>{item.title}</span>
                  <Pill status={item.status} />
                </div>
              ))}
            </Panel>
            <Panel title="Selected case">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">{selectedCase.id}</span>
                <Pill status={selectedCase.status} />
              </div>
              <p className="mt-3 text-sm">{selectedCase.customer}</p>
              <p className="text-xs text-zinc-600">
                {selectedCase.reason} / {selectedCase.amount} / due {selectedCase.due}
              </p>
              <div className="mt-4 border-2 border-dashed border-zinc-400 p-3 text-xs">
                Click opens full case detail: actions, decisions, logs, evidence packet, Stripe
                submission.
              </div>
            </Panel>
          </div>
        </div>
      </Shell>
    )
  },
}

export const CaseDetailEvidenceAndLogs: Story = {
  name: '5. Case Detail Evidence + Logs',
  render: () => {
    const [tab, setTab] = useState<'summary' | 'evidence' | 'decision' | 'logs' | 'notifications'>(
      'summary',
    )
    const timeline = useMemo(
      () => [
        ['00:00', 'Stripe webhook received', 'charge.dispute.created for $249 fraudulent dispute.'],
        ['00:03', 'Customer matched', 'Stripe email matched app user id user_1842.'],
        ['00:08', 'Usage queried', '37 sessions, 184 outputs, 16 downloads found.'],
        ['00:22', 'Evidence generated', 'PDF and Stripe fields rendered.'],
        ['00:41', 'Submitted', 'Stripe request req_9af2 accepted evidence.'],
      ],
      [],
    )

    return (
      <Shell
        title="Case detail is the audit trail"
        subtitle="The user can inspect what Riposte did: evidence, generated output, decisions, logs, and notifications."
      >
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <Panel title="Case dp_3Qx9Kl2m">
            <div className="flex items-center gap-2">
              <Pill status="submitted" />
              <span className="border border-zinc-950 px-2 py-0.5 text-[11px]">
                92/100 evidence
              </span>
            </div>
            <div className="mt-5 space-y-2 text-xs">
              <div>Customer: maria@acme.ai</div>
              <div>Amount: $249.00</div>
              <div>Reason: fraudulent</div>
              <div>Due: May 12</div>
              <div>Stripe request: req_9af2</div>
              <div>Packet hash: pdf_7c21</div>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              {(['summary', 'evidence', 'decision', 'logs', 'notifications'] as const).map(
                (item) => (
                  <Button key={item} active={tab === item} onClick={() => setTab(item)}>
                    {item}
                  </Button>
                ),
              )}
            </div>
          </Panel>
          <Panel title={tab}>
            {tab === 'summary' && (
              <div className="grid gap-5 lg:grid-cols-2">
                <Box label="Agent summary">
                  <p className="text-sm">
                    Riposte submitted evidence because the user paid, created an account, actively
                    used the product, downloaded outputs, and never requested a refund.
                  </p>
                </Box>
                <Box label="Timeline">
                  <div className="space-y-2">
                    {timeline.map(([time, title]) => (
                      <div key={time} className="text-xs">
                        <strong>{time}</strong> {title}
                      </div>
                    ))}
                  </div>
                </Box>
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
                <Box label="PDF">
                  <div className="h-80 border-2 border-zinc-950 bg-white p-4">
                    <div className="h-5 w-40 bg-zinc-300" />
                    <div className="mt-5 space-y-2">
                      <div className="h-3 bg-zinc-200" />
                      <div className="h-3 bg-zinc-200" />
                      <div className="h-3 w-2/3 bg-zinc-200" />
                    </div>
                    <div className="mt-6 h-28 bg-zinc-200" />
                  </div>
                </Box>
              </div>
            )}
            {tab === 'decision' && (
              <div className="space-y-4">
                <Box label="Contest decision">
                  <p className="text-sm">
                    Auto-submit policy was enabled. Evidence score was 92/100. No blocking access
                    errors. Dispute reason was supported by configured evidence playbook.
                  </p>
                </Box>
                <Box label="Generated Stripe fields">
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>uncategorized_text:</strong> Customer received and used service after
                      purchase.
                    </div>
                    <div>
                      <strong>access_activity_log:</strong> Signup, sessions, outputs, downloads,
                      last active date.
                    </div>
                    <div>
                      <strong>refund_refusal_explanation:</strong> No refund request existed before
                      dispute.
                    </div>
                  </div>
                </Box>
              </div>
            )}
            {tab === 'logs' && (
              <div className="space-y-2">
                {timeline.map(([time, title, detail]) => (
                  <div
                    key={time}
                    className="grid grid-cols-[70px_1fr] gap-3 border-b border-zinc-300 py-2 text-xs last:border-b-0"
                  >
                    <span className="font-mono text-zinc-500">{time}</span>
                    <span>
                      <strong>{title}</strong> · {detail}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {tab === 'notifications' && (
              <div className="space-y-3">
                <Box label="Slack">
                  #chargebacks: Evidence submitted for dp_3Qx9Kl2m. Stripe request req_9af2.
                </Box>
                <Box label="Telegram">Not configured for this workspace.</Box>
                <Box label="Fallback">Email skipped because Slack delivery was confirmed.</Box>
              </div>
            )}
          </Panel>
        </div>
      </Shell>
    )
  },
}

export const BreakageAndNotificationRecovery: Story = {
  name: '6. Breakage + Notification Recovery',
  render: () => {
    const [failure, setFailure] = useState<
      'stripe' | 'database' | 'notification' | 'weak_evidence'
    >('database')
    const copy = {
      stripe: {
        title: 'Stripe write scope missing',
        impact: 'Riposte can detect disputes but cannot submit evidence.',
        action: 'Reconnect Stripe with disputes.write and rerun setup test.',
      },
      database: {
        title: 'Read-only DB credential expired',
        impact: 'Riposte cannot gather product usage evidence. Autopilot pauses new submissions.',
        action: 'Refresh DB credential, verify table mappings, rerun setup test.',
      },
      notification: {
        title: 'Slack delivery failed',
        impact: 'Automation can continue, but the founder may miss important dispute updates.',
        action: 'Reconnect Slack or enable Telegram fallback.',
      },
      weak_evidence: {
        title: 'Evidence below threshold',
        impact: 'Riposte found payment data but cannot prove product delivery.',
        action: 'Map activity tables or connect evidence storage before enabling autopilot.',
      },
    }[failure]

    return (
      <Shell
        title="Breakage is a first-class flow"
        subtitle="If automation breaks, the user gets notified, sees impact, and gets one repair action. No silent failure."
      >
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <Panel title="Failure selector">
            <div className="flex flex-col gap-2">
              {(['stripe', 'database', 'notification', 'weak_evidence'] as const).map((item) => (
                <Button key={item} active={failure === item} onClick={() => setFailure(item)}>
                  {item.replaceAll('_', ' ')}
                </Button>
              ))}
            </div>
          </Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Control-room alert">
              <div className="border-4 border-zinc-950 bg-white p-5">
                <div className="text-lg font-semibold">{copy.title}</div>
                <p className="mt-2 text-sm text-zinc-700">{copy.impact}</p>
                <div className="mt-5 flex gap-2">
                  <Button>Fix now</Button>
                  <Button>View affected cases</Button>
                </div>
              </div>
            </Panel>
            <Panel title="Notification + recovery">
              <Box label="Slack / Telegram message">
                <p className="text-sm">
                  Riposte needs attention: {copy.title}. Impact: {copy.impact}
                </p>
              </Box>
              <div className="mt-4 space-y-3 text-sm">
                <div className="border-2 border-zinc-950 bg-zinc-950 p-3 text-white">
                  1. Pause risky automation
                </div>
                <div className="border-2 border-zinc-950 p-3">2. Explain exact impact</div>
                <div className="border-2 border-zinc-950 p-3">3. Show affected cases</div>
                <div className="border-2 border-zinc-950 p-3">
                  4. Run repair action: {copy.action}
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </Shell>
    )
  },
}
