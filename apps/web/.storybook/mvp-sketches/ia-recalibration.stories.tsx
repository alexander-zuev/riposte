import {
  ArrowRightIcon,
  CaretDownIcon,
  CaretRightIcon,
  ChatCircleDotsIcon,
  CheckCircleIcon,
  CircleIcon,
  CloudIcon,
  CreditCardIcon,
  DatabaseIcon,
  GaugeIcon,
  GearIcon,
  HouseIcon,
  LightningIcon,
  PackageIcon,
  PlusIcon,
  PlugsConnectedIcon,
  ReceiptIcon,
  ScrollIcon,
  ShieldCheckIcon,
  SignOutIcon,
  SparkleIcon,
  TrophyIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo, useState } from 'react'

const meta: Meta = {
  title: 'MVP Sketches/IA Recalibration',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

/* -------------------------------------------------------------------------- *
 * Domain types
 * -------------------------------------------------------------------------- */

type SetupStepKey = 'product_info' | 'stripe' | 'database' | 'playbook'
type SetupStatus = 'done' | 'pending' | 'blocked'
type SetupStep = { key: SetupStepKey; label: string; status: SetupStatus; action?: string }

/**
 * The agent has one explicit mode at a time. Mode drives the system prompt,
 * tool palette, and what /agent renders:
 *   - setup     → onboarding chat constrained to a linear script
 *   - idle      → post-setup, activity feed only
 *   - handling  → runtime extraction for one dispute in flight
 *
 * Mode transitions emit activity feed entries. There is no free chat in MVP.
 */
type SetupSubStep =
  | 'welcome'
  | 'connect_stripe'
  | 'connect_data'
  | 'pick_dispute'
  | 'dry_run'
  | 'playbook_draft'

type AgentMode =
  | { kind: 'setup'; step: SetupSubStep }
  | { kind: 'idle' }
  | { kind: 'handling'; disputeCaseId: string }

type AgentActivityKind =
  | 'dispute_received'
  | 'evidence_collected'
  | 'packet_submitted'
  | 'connection_refreshed'
  | 'dispute_won'
  | 'evidence_low'

type AgentActivity = {
  id: string
  when: string
  kind: AgentActivityKind
  summary: string
  detail?: string
}

type ProductId = string

type Product = {
  id: ProductId
  name: string
  url: string
  status: 'setup_pending' | 'setup_complete' | 'disabled'
  pendingDisputes: number
  setup: SetupStep[]
  agentMode: AgentMode
  agentActivity: AgentActivity[]
}

type EvidenceQuality = 'high' | 'medium' | 'low'

type DisputeCase = {
  id: string
  customer: string
  amount: number
  reason: string
  dueIn: string
  evidenceQuality: EvidenceQuality
  action: string
  status: 'urgent' | 'ready' | 'collecting'
}

type ConnectionState = 'ready' | 'needs_input' | 'not_configured' | 'error'
type Connection = {
  kind: 'stripe' | 'postgres' | 'mcp_neon'
  label: string
  detail: string
  state: ConnectionState
}

type Route =
  | { name: 'products_list' }
  | { name: 'products_new' }
  | { name: 'product_dashboard'; productId: ProductId }
  | { name: 'product_agent'; productId: ProductId }
  | { name: 'product_disputes'; productId: ProductId }
  | { name: 'product_dispute_detail'; productId: ProductId; disputeId: string }
  | { name: 'product_playbook'; productId: ProductId }
  | { name: 'product_connections'; productId: ProductId }
  | { name: 'product_info'; productId: ProductId }
  | { name: 'settings_billing' }
  | { name: 'settings_notifications' }

type WorkflowStepKey =
  | 'triage'
  | 'enrich'
  | 'collect_evidence'
  | 'generate_packet'
  | 'submission_decision'
  | 'submit_response'
  | 'outcome'

type WorkflowStepState = 'pending' | 'active' | 'done' | 'failed' | 'skipped'

type WorkflowStep = {
  key: WorkflowStepKey
  label: string
  state: WorkflowStepState
  detail?: string
}

/* -------------------------------------------------------------------------- *
 * Sample data
 * -------------------------------------------------------------------------- */

function makeProduct(
  id: 'typist' | 'spawnbase' | 'kollektiv',
  overrides: Partial<Product> = {},
): Product {
  const defaults: Record<'typist' | 'spawnbase' | 'kollektiv', Product> = {
    typist: {
      id: 'typist',
      name: 'Typist',
      url: 'typist.com',
      status: 'setup_complete',
      pendingDisputes: 3,
      setup: [
        { key: 'product_info', label: 'Product info', status: 'done' },
        { key: 'stripe', label: 'Stripe connection', status: 'done' },
        { key: 'database', label: 'App data', status: 'done' },
        { key: 'playbook', label: 'Playbook', status: 'done' },
      ],
      agentMode: { kind: 'idle' },
      agentActivity: TYPIST_ACTIVITY,
    },
    spawnbase: {
      id: 'spawnbase',
      name: 'Spawnbase',
      url: 'spawnbase.ai',
      status: 'setup_pending',
      pendingDisputes: 0,
      setup: [
        { key: 'product_info', label: 'Product info', status: 'done' },
        { key: 'stripe', label: 'Stripe connection', status: 'done' },
        {
          key: 'database',
          label: 'App data',
          status: 'pending',
          action: 'Connect Postgres',
        },
        { key: 'playbook', label: 'Playbook', status: 'blocked', action: 'Connect database first' },
      ],
      agentMode: { kind: 'setup', step: 'connect_data' },
      agentActivity: [],
    },
    kollektiv: {
      id: 'kollektiv',
      name: 'Kollektiv',
      url: 'thekollektiv.ai',
      status: 'setup_pending',
      pendingDisputes: 0,
      setup: [
        { key: 'product_info', label: 'Product info', status: 'done' },
        { key: 'stripe', label: 'Stripe connection', status: 'pending', action: 'Connect Stripe' },
        {
          key: 'database',
          label: 'App data',
          status: 'blocked',
          action: 'Connect Stripe first',
        },
        { key: 'playbook', label: 'Playbook', status: 'blocked', action: 'Connect Stripe first' },
      ],
      agentMode: { kind: 'setup', step: 'welcome' },
      agentActivity: [],
    },
  }
  return { ...defaults[id], ...overrides }
}

const TYPIST_ACTIVITY: AgentActivity[] = [
  {
    id: 'act_1',
    when: '2 min ago',
    kind: 'packet_submitted',
    summary: 'Submitted evidence for dispute du_acme',
    detail: 'Fraudulent · $349 · evidence quality: high · auto-submitted',
  },
  {
    id: 'act_2',
    when: '14 min ago',
    kind: 'evidence_collected',
    summary: 'Collected evidence for du_acme',
    detail: '4 Postgres queries · 1 Stripe call · matched customer to user_4f21',
  },
  {
    id: 'act_3',
    when: '14 min ago',
    kind: 'dispute_received',
    summary: 'Received dispute du_acme from Stripe',
    detail: 'Fraudulent · $349 · acme@example.com · due in 4d 12h',
  },
  {
    id: 'act_4',
    when: '1 hour ago',
    kind: 'evidence_low',
    summary: 'Could not build packet for du_north',
    detail: 'Subscription canceled · cancellation policy disclosure missing · awaiting human',
  },
  {
    id: 'act_5',
    when: 'yesterday',
    kind: 'connection_refreshed',
    summary: 'Refreshed Postgres OAuth token',
    detail: 'Next refresh scheduled for tomorrow at 14:02',
  },
  {
    id: 'act_6',
    when: '3 days ago',
    kind: 'dispute_won',
    summary: 'Won dispute du_legacy · $189 recovered',
    detail: 'Fraudulent · evidence submitted 6 days ago · issuer ruled in our favor',
  },
]

const STRIPE_NEEDS_DB: Connection[] = [
  {
    kind: 'stripe',
    label: 'Stripe',
    detail: 'Disputes, charges, customers, invoices, files',
    state: 'ready',
  },
  {
    kind: 'postgres',
    label: 'Postgres (Neon)',
    detail: 'Read-only access for customer matching and usage evidence',
    state: 'not_configured',
  },
]

const ALL_READY: Connection[] = [
  {
    kind: 'stripe',
    label: 'Stripe',
    detail: 'Disputes, charges, customers, invoices, files',
    state: 'ready',
  },
  {
    kind: 'postgres',
    label: 'Postgres (Neon)',
    detail: 'Read-only access for customer matching and usage evidence',
    state: 'ready',
  },
]

const CONNECTIONS_WITH_DETAILS: Connection[] = [
  {
    kind: 'stripe',
    label: 'Stripe',
    detail: 'acct_1Rsq0qDGi8KWRsUN · Connected 12 May 2026',
    state: 'ready',
  },
  {
    kind: 'postgres',
    label: 'Postgres (Neon)',
    detail: 'typist-prod · read_only role · 4 tables indexed',
    state: 'ready',
  },
]

const TYPIST_AND_SPAWNBASE = [makeProduct('typist'), makeProduct('spawnbase')]
const ONLY_SPAWNBASE = [makeProduct('spawnbase')]

const sampleDisputes: DisputeCase[] = [
  {
    id: 'du_acme',
    customer: 'acme@example.com',
    amount: 349_00,
    reason: 'Fraudulent',
    dueIn: '4d 12h',
    evidenceQuality: 'medium',
    action: 'Review packet',
    status: 'ready',
  },
  {
    id: 'du_north',
    customer: 'northstar@example.com',
    amount: 99_00,
    reason: 'Subscription canceled',
    dueIn: '8d 03h',
    evidenceQuality: 'low',
    action: 'Add policy proof',
    status: 'urgent',
  },
  {
    id: 'du_atlas',
    customer: 'atlas@example.com',
    amount: 19_00,
    reason: 'Duplicate',
    dueIn: '15d 18h',
    evidenceQuality: 'high',
    action: 'Collecting facts',
    status: 'collecting',
  },
]

/* -------------------------------------------------------------------------- *
 * Shared layout
 * -------------------------------------------------------------------------- */

function Shell({
  products,
  currentProductId,
  onSwitchProduct,
  route,
  onNavigate,
  children,
}: {
  products: Product[]
  currentProductId: ProductId | null
  onSwitchProduct: (id: ProductId) => void
  route: Route
  onNavigate: (route: Route) => void
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        products={products}
        currentProductId={currentProductId}
        onSwitchProduct={onSwitchProduct}
        route={route}
        onNavigate={onNavigate}
      />
      <main className="flex-1 overflow-y-auto">
        <TopBar route={route} products={products} onNavigate={onNavigate} />
        <div className="px-8 py-6">{children}</div>
      </main>
    </div>
  )
}

function Sidebar({
  products,
  currentProductId,
  onSwitchProduct,
  route,
  onNavigate,
}: {
  products: Product[]
  currentProductId: ProductId | null
  onSwitchProduct: (id: ProductId) => void
  route: Route
  onNavigate: (route: Route) => void
}) {
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const currentProduct = products.find((p) => p.id === currentProductId)
  const inProductContext = currentProductId !== null && route.name.startsWith('product_')

  return (
    <aside className="bg-background-subtle flex w-64 flex-shrink-0 flex-col border-r border-border">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4">
        <div className="flex size-7 items-center justify-center rounded bg-foreground/90 text-xs font-semibold text-background">
          R
        </div>
        <span className="font-semibold tracking-tight">Riposte</span>
      </div>

      <div className="px-3 py-3">
        {inProductContext && currentProduct ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setSwitcherOpen((open) => !open)}
              className="hover:bg-background-subtle flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <PackageIcon weight="duotone" className="size-4 flex-shrink-0" />
                <span className="truncate font-medium">{currentProduct.name}</span>
              </div>
              <CaretDownIcon className="size-3 opacity-60" />
            </button>
            {switcherOpen ? (
              <div className="absolute top-full right-0 left-0 z-10 mt-1 overflow-hidden rounded-md border border-border bg-background shadow-lg">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onSwitchProduct(p.id)
                      setSwitcherOpen(false)
                      onNavigate({ name: 'product_dashboard', productId: p.id })
                    }}
                    className={`hover:bg-background-subtle flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                      p.id === currentProductId ? 'bg-background-subtle' : ''
                    }`}
                  >
                    <PackageIcon weight="duotone" className="size-4" />
                    <span className="truncate">{p.name}</span>
                    {p.status === 'setup_pending' ? (
                      <span className="text-warning-foreground ml-auto text-xs">setup</span>
                    ) : null}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSwitcherOpen(false)
                    onNavigate({ name: 'products_list' })
                  }}
                  className="hover:bg-background-subtle flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-muted-foreground"
                >
                  <HouseIcon className="size-4" />
                  All products
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSwitcherOpen(false)
                    onNavigate({ name: 'products_new' })
                  }}
                  className="hover:bg-background-subtle flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground"
                >
                  <PlusIcon className="size-4" />
                  Add product
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate({ name: 'products_list' })}
            className="hover:bg-background-subtle flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
          >
            <HouseIcon weight="duotone" className="size-4" />
            All products
          </button>
        )}
      </div>

      {inProductContext && currentProduct ? (
        <NavSection label="Operate">
          <NavItem
            icon={GaugeIcon}
            label="Dashboard"
            active={route.name === 'product_dashboard'}
            onClick={() => onNavigate({ name: 'product_dashboard', productId: currentProduct.id })}
          />
          <NavItem
            icon={ReceiptIcon}
            label="Disputes"
            badge={currentProduct.pendingDisputes || undefined}
            active={route.name === 'product_disputes'}
            onClick={() => onNavigate({ name: 'product_disputes', productId: currentProduct.id })}
          />
          <NavItem
            icon={SparkleIcon}
            label="Agent"
            badge={agentModeBadge(currentProduct.agentMode)}
            active={route.name === 'product_agent'}
            onClick={() => onNavigate({ name: 'product_agent', productId: currentProduct.id })}
          />
        </NavSection>
      ) : null}

      {inProductContext && currentProduct ? (
        <NavSection label="Setup">
          <NavItem
            icon={PackageIcon}
            label="Product info"
            active={route.name === 'product_info'}
            onClick={() => onNavigate({ name: 'product_info', productId: currentProduct.id })}
          />
          <NavItem
            icon={PlugsConnectedIcon}
            label="Connections"
            active={route.name === 'product_connections'}
            onClick={() =>
              onNavigate({ name: 'product_connections', productId: currentProduct.id })
            }
          />
          <NavItem
            icon={ScrollIcon}
            label="Playbook"
            active={route.name === 'product_playbook'}
            onClick={() => onNavigate({ name: 'product_playbook', productId: currentProduct.id })}
          />
        </NavSection>
      ) : null}

      <div className="mt-auto">
        <NavSection label="Workspace">
          <NavItem
            icon={CreditCardIcon}
            label="Billing"
            active={route.name === 'settings_billing'}
            onClick={() => onNavigate({ name: 'settings_billing' })}
          />
          <NavItem
            icon={LightningIcon}
            label="Notifications"
            active={route.name === 'settings_notifications'}
            onClick={() => onNavigate({ name: 'settings_notifications' })}
          />
        </NavSection>
      </div>
    </aside>
  )
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2">
      <div className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: typeof GaugeIcon
  label: string
  active?: boolean
  badge?: number | string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
        active ? 'bg-foreground text-background' : 'hover:bg-background-subtle text-foreground'
      }`}
    >
      <Icon weight="duotone" className="size-4" />
      <span>{label}</span>
      {badge ? (
        <span
          className={`ml-auto rounded-full px-1.5 py-0 text-xs ${
            active ? 'bg-background/20' : 'bg-foreground/10 text-foreground'
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  )
}

function agentModeBadge(mode: AgentMode): string | undefined {
  switch (mode.kind) {
    case 'setup':
      return 'setup'
    case 'handling':
      return 'live'
    case 'idle':
      return undefined
    default:
      return undefined
  }
}

function TopBar({
  route,
  products,
  onNavigate,
}: {
  route: Route
  products: Product[]
  onNavigate: (r: Route) => void
}) {
  const crumbs = useMemo(() => buildBreadcrumb(route, products), [route, products])

  return (
    <div className="flex h-12 items-center justify-between border-b border-border bg-background px-8">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        {crumbs.map((crumb, idx) => (
          <span key={crumb.label} className="flex items-center gap-2">
            {idx > 0 ? <CaretRightIcon className="size-3 opacity-60" /> : null}
            {crumb.route ? (
              <button
                type="button"
                onClick={() => onNavigate(crumb.route!)}
                className="hover:text-foreground"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="font-medium text-foreground">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <UserDropdown />
    </div>
  )
}

function UserDropdown() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-background-subtle flex items-center gap-2 rounded-md px-2 py-1 text-sm"
      >
        <div className="flex size-7 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold">
          A
        </div>
        <div className="hidden text-left leading-tight md:block">
          <div className="text-sm font-medium">Alexander Zuev</div>
          <div className="text-xs text-muted-foreground">azuev@outlook.com</div>
        </div>
        <CaretDownIcon className="size-3 opacity-60" />
      </button>
      {open ? (
        <div className="absolute top-full right-0 z-10 mt-1 w-48 overflow-hidden rounded-md border border-border bg-background shadow-lg">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="hover:bg-background-subtle flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
          >
            <GearIcon className="size-4" />
            Profile
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="hover:bg-background-subtle flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-muted-foreground"
          >
            <SignOutIcon className="size-4" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  )
}

function buildBreadcrumb(
  route: Route,
  products: Product[],
): Array<{ label: string; route?: Route }> {
  switch (route.name) {
    case 'products_list':
      return [{ label: 'Products' }]
    case 'products_new':
      return [{ label: 'Products', route: { name: 'products_list' } }, { label: 'New product' }]
    case 'product_dashboard':
    case 'product_agent':
    case 'product_disputes':
    case 'product_playbook':
    case 'product_connections':
    case 'product_info': {
      const product = products.find((p) => p.id === route.productId)
      const productName = product?.name ?? 'Product'
      const pageLabel = {
        product_dashboard: 'Dashboard',
        product_agent: 'Agent',
        product_disputes: 'Disputes',
        product_playbook: 'Playbook',
        product_connections: 'Connections',
        product_info: 'Product info',
      }[route.name]
      return [
        { label: 'Products', route: { name: 'products_list' } },
        { label: productName, route: { name: 'product_dashboard', productId: route.productId } },
        { label: pageLabel },
      ]
    }
    case 'product_dispute_detail': {
      const product = products.find((p) => p.id === route.productId)
      const productName = product?.name ?? 'Product'
      return [
        { label: 'Products', route: { name: 'products_list' } },
        { label: productName, route: { name: 'product_dashboard', productId: route.productId } },
        {
          label: 'Disputes',
          route: { name: 'product_disputes', productId: route.productId },
        },
        { label: route.disputeId },
      ]
    }
    case 'settings_billing':
      return [{ label: 'Workspace' }, { label: 'Billing' }]
    case 'settings_notifications':
      return [{ label: 'Workspace' }, { label: 'Notifications' }]
    default:
      return []
  }
}

/* -------------------------------------------------------------------------- *
 * Page components
 * -------------------------------------------------------------------------- */

function ProductsList({
  products,
  onSelect,
  onCreate,
}: {
  products: Product[]
  onSelect: (id: ProductId) => void
  onCreate: () => void
}) {
  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-foreground/5">
          <ShieldCheckIcon weight="duotone" className="size-8 opacity-80" />
        </div>
        <h1 className="mb-2 text-2xl font-semibold">Welcome to Riposte</h1>
        <p className="mb-8 text-muted-foreground">
          Products are the apps you protect against Stripe disputes. Create your first to get
          started.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 font-medium text-background hover:opacity-90"
        >
          <PlusIcon className="size-4" />
          Create your first product
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your products</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} product{products.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          <PlusIcon className="size-4" />
          Add product
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const setupRatio = product.setup.filter((s) => s.status === 'done').length
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelect(product.id)}
              className="rounded-lg border border-border bg-background p-5 text-left transition-colors hover:border-foreground/30"
            >
              <div className="mb-3 flex items-start justify-between">
                <PackageIcon weight="duotone" className="size-6" />
                {product.status === 'setup_pending' ? (
                  <span className="text-warning-foreground rounded bg-warning/20 px-2 py-0.5 text-[10px] tracking-wider uppercase">
                    Setup pending
                  </span>
                ) : product.status === 'disabled' ? (
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] tracking-wider text-muted-foreground uppercase">
                    Disabled
                  </span>
                ) : (
                  <span className="rounded bg-success/20 px-2 py-0.5 text-[10px] tracking-wider text-success-foreground uppercase">
                    Active
                  </span>
                )}
              </div>
              <div className="mb-0.5 font-semibold">{product.name}</div>
              <div className="mb-4 text-xs text-muted-foreground">{product.url}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {product.pendingDisputes > 0
                    ? `${product.pendingDisputes} pending dispute${product.pendingDisputes === 1 ? '' : 's'}`
                    : 'No pending disputes'}
                </span>
                <span>
                  Setup {setupRatio}/{product.setup.length}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProductCreateForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void
  onCreate: (input: { name: string; url: string }) => void
}) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-xl font-semibold">Create a product</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        A product is the app you want Riposte to defend against Stripe disputes.
      </p>

      <div className="space-y-4">
        <Field label="Product name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Typist"
            aria-label="Product name"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Product URL">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="typist.com"
            aria-label="Product URL"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Product type">
          <select
            disabled
            value="digital"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="digital">Digital product or service</option>
          </select>
          <div className="mt-1 text-xs text-muted-foreground">
            MVP supports digital products and services only.
          </div>
        </Field>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onCreate({ name: name || 'New Product', url: url || 'example.com' })}
          disabled={!name || !url}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
        >
          Create product
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="hover:bg-background-subtle rounded-md px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}

function ProductDashboard({
  product,
  onNavigate,
}: {
  product: Product
  onNavigate: (r: Route) => void
}) {
  const allDone = product.status === 'setup_complete'

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-sm text-muted-foreground">{product.url}</p>
        </div>
      </div>

      {!allDone ? (
        <SetupBanner
          product={product}
          onOpenAgent={() => onNavigate({ name: 'product_agent', productId: product.id })}
        />
      ) : null}

      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Pending" value={product.pendingDisputes.toString()} icon={CircleIcon} />
        <MetricCard label="Ready for review" value="1" icon={CheckCircleIcon} />
        <MetricCard label="At risk" value="$467" icon={WarningIcon} variant="warn" />
        <MetricCard label="Recovered" value="$0" icon={CheckCircleIcon} />
      </div>

      {allDone ? (
        <div className="rounded-lg border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <WarningIcon weight="duotone" className="size-5" />
                Urgent cases
              </div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                Stripe-facing decisions that need review, setup, or evidence before deadline
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate({ name: 'product_disputes', productId: product.id })}
              className="inline-flex items-center gap-1 text-sm font-medium hover:opacity-80"
            >
              Review all
              <ArrowRightIcon className="size-3" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {sampleDisputes.map((d) => (
              <div key={d.id} className="grid grid-cols-12 items-center gap-4 px-5 py-3 text-sm">
                <div className="col-span-3">
                  <div className="font-medium">{d.customer}</div>
                  <div className="text-xs text-muted-foreground">{d.reason}</div>
                </div>
                <div className="col-span-2 font-mono">${(d.amount / 100).toFixed(0)}</div>
                <div className="col-span-2 font-mono text-xs text-muted-foreground">{d.dueIn}</div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">Evidence</div>
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[10px] tracking-wider uppercase ${
                      d.evidenceQuality === 'high'
                        ? 'bg-success/20 text-success-foreground'
                        : d.evidenceQuality === 'medium'
                          ? 'text-warning-foreground bg-warning/20'
                          : 'bg-destructive/20 text-destructive-foreground'
                    }`}
                  >
                    {d.evidenceQuality}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <button
                    type="button"
                    className="hover:bg-background-subtle rounded-md border border-border px-3 py-1.5 text-xs"
                  >
                    {d.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyStateInline
          icon={ReceiptIcon}
          title="No disputes yet"
          description="Once setup is complete, your incoming disputes will appear here."
        />
      )}

      {allDone ? (
        <div className="grid grid-cols-2 gap-3">
          <AutopilotCard />
          <SystemHealthCard />
        </div>
      ) : null}
    </div>
  )
}

function SetupBanner({ product, onOpenAgent }: { product: Product; onOpenAgent: () => void }) {
  const chips = deriveScriptChips(product)
  const doneCount = chips.filter((c) => c.status === 'done').length
  const totalCount = chips.length
  const ratio = doneCount / totalCount

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <WarningIcon weight="duotone" className="size-5 text-warning-muted-foreground" />
          <div className="min-w-0">
            <div className="text-sm font-medium">Setup not complete</div>
            <p className="text-xs text-muted-foreground">
              Riposte won't auto-defend disputes until setup is complete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {doneCount} of {totalCount}
          </span>
          <button
            type="button"
            onClick={onOpenAgent}
            className="hover:bg-primary-hover inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
          >
            Continue setup
            <ArrowRightIcon className="size-3" />
          </button>
        </div>
      </div>
      <div className="h-px bg-border" />
      <div className="flex flex-wrap items-center gap-2 px-5 py-3">
        {chips.map((chip, idx) => (
          <SetupStepChip key={chip.key} chip={chip} showSeparator={idx > 0} />
        ))}
      </div>
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-foreground transition-all"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  )
}

type ScriptChip = {
  key: SetupSubStep
  label: string
  status: 'done' | 'active' | 'upcoming'
}

function deriveScriptChips(product: Product): ScriptChip[] {
  const isComplete = product.status === 'setup_complete'
  const currentIdx =
    !isComplete && product.agentMode.kind === 'setup'
      ? SETUP_STEP_ORDER.indexOf(product.agentMode.step)
      : SETUP_STEP_ORDER.length
  return SETUP_STEP_ORDER.map((step, idx) => ({
    key: step,
    label: SETUP_STEP_TITLES[step],
    status: idx < currentIdx ? 'done' : idx === currentIdx ? 'active' : 'upcoming',
  }))
}

function SetupStepChip({ chip, showSeparator }: { chip: ScriptChip; showSeparator: boolean }) {
  return (
    <>
      {showSeparator ? <CaretRightIcon className="size-3 text-muted-foreground/40" /> : null}
      <span
        className={`inline-flex items-center gap-1.5 text-xs ${
          chip.status === 'active'
            ? 'font-medium text-foreground'
            : chip.status === 'done'
              ? 'text-foreground'
              : 'text-muted-foreground'
        }`}
      >
        {chip.status === 'done' ? (
          <CheckCircleIcon weight="fill" className="size-3.5 text-success-muted-foreground" />
        ) : chip.status === 'active' ? (
          <CircleIcon weight="fill" className="size-3.5 text-foreground" />
        ) : (
          <CircleIcon className="size-3.5 text-muted-foreground/40" />
        )}
        {chip.label}
      </span>
    </>
  )
}

/* -------------------------------------------------------------------------- *
 * Agent page
 * -------------------------------------------------------------------------- */

const SETUP_STEP_ORDER: SetupSubStep[] = [
  'welcome',
  'connect_stripe',
  'connect_data',
  'pick_dispute',
  'dry_run',
  'playbook_draft',
]

const SETUP_STEP_TITLES: Record<SetupSubStep, string> = {
  welcome: 'Get started',
  connect_stripe: 'Connect Stripe',
  connect_data: 'Connect app data',
  pick_dispute: 'Pick a real dispute',
  dry_run: 'Dry-run',
  playbook_draft: 'Review playbook',
}

function AgentPage({
  product,
  onAdvanceAgent,
  onNavigate,
}: {
  product: Product
  onAdvanceAgent: (productId: ProductId, next: SetupSubStep | 'complete') => void
  onNavigate: (r: Route) => void
}) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[1fr_280px] gap-6">
      <div className="space-y-4">
        <AgentPageHeader product={product} />
        {product.agentMode.kind === 'setup' ? (
          <AgentOnboarding product={product} onAdvanceAgent={onAdvanceAgent} />
        ) : product.agentMode.kind === 'handling' ? (
          <AgentHandlingView product={product} onNavigate={onNavigate} />
        ) : (
          <ActivityFeed
            entries={product.agentActivity}
            trailing={
              <button
                type="button"
                onClick={() => onNavigate({ name: 'product_disputes', productId: product.id })}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                View disputes
                <ArrowRightIcon className="size-3" />
              </button>
            }
          />
        )}
      </div>
      <div className="space-y-4">
        {product.agentMode.kind === 'setup' ? (
          <AgentSetupSidebar mode={product.agentMode} />
        ) : (
          <AgentIdleSidebar product={product} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  )
}

function AgentPageHeader({ product }: { product: Product }) {
  const subtitle =
    product.agentMode.kind === 'setup'
      ? `Onboarding · ${SETUP_STEP_TITLES[product.agentMode.step]}`
      : product.agentMode.kind === 'handling'
        ? `Live · defending dispute ${product.agentMode.disputeCaseId}`
        : `Active · defending ${product.name}`
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-lg bg-foreground/10">
        <SparkleIcon weight="duotone" className="size-5" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">Agent</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

function AgentSetupSidebar({ mode }: { mode: { kind: 'setup'; step: SetupSubStep } }) {
  const currentIdx = SETUP_STEP_ORDER.indexOf(mode.step)
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-3 text-xs tracking-wider text-muted-foreground uppercase">
        Onboarding script
      </div>
      <ol className="space-y-2">
        {SETUP_STEP_ORDER.map((s, idx) => {
          const status: 'done' | 'active' | 'upcoming' =
            idx < currentIdx ? 'done' : idx === currentIdx ? 'active' : 'upcoming'
          return (
            <li key={s} className="flex items-center gap-2 text-sm">
              {status === 'done' ? (
                <CheckCircleIcon weight="fill" className="size-4 text-success-muted-foreground" />
              ) : status === 'active' ? (
                <CircleIcon weight="fill" className="size-4 text-foreground" />
              ) : (
                <CircleIcon className="size-4 text-muted-foreground/40" />
              )}
              <span
                className={
                  status === 'upcoming'
                    ? 'text-muted-foreground/60'
                    : status === 'active'
                      ? 'font-medium'
                      : ''
                }
              >
                {SETUP_STEP_TITLES[s]}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function AgentIdleSidebar({
  product,
  onNavigate,
}: {
  product: Product
  onNavigate: (r: Route) => void
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="mb-2 text-xs tracking-wider text-muted-foreground uppercase">
          Quick actions
        </div>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onNavigate({ name: 'product_playbook', productId: product.id })}
            className="hover:bg-background-subtle flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm"
          >
            <ScrollIcon weight="duotone" className="size-4" />
            Edit playbook
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'product_connections', productId: product.id })}
            className="hover:bg-background-subtle flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm"
          >
            <PlugsConnectedIcon weight="duotone" className="size-4" />
            Manage connections
          </button>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'product_disputes', productId: product.id })}
            className="hover:bg-background-subtle flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm"
          >
            <ReceiptIcon weight="duotone" className="size-4" />
            View disputes
          </button>
        </div>
      </div>
      <div className="bg-background-subtle rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
        Free chat with the agent is coming after MVP. For now the agent runs autonomously per
        dispute; activity log shows what it has done.
      </div>
    </div>
  )
}

type FreeFormMessage = { id: string; from: 'user' | 'agent'; text: string }

function AgentOnboarding({
  product,
  onAdvanceAgent,
}: {
  product: Product
  onAdvanceAgent: (productId: ProductId, next: SetupSubStep | 'complete') => void
}) {
  const [freeForm, setFreeForm] = useState<FreeFormMessage[]>([])

  if (product.agentMode.kind !== 'setup') return null
  const currentIdx = SETUP_STEP_ORDER.indexOf(product.agentMode.step)
  const completedSteps = SETUP_STEP_ORDER.slice(0, currentIdx)
  const activeStep = product.agentMode.step

  const handleSubmit = (text: string) => {
    const userMsg: FreeFormMessage = {
      id: `msg_${Date.now()}_u`,
      from: 'user',
      text,
    }
    const agentMsg: FreeFormMessage = {
      id: `msg_${Date.now()}_a`,
      from: 'agent',
      text: "Noted. I'll come back to that — for now, click the action above to continue the script.",
    }
    setFreeForm((prev) => [...prev, userMsg, agentMsg])
  }

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col rounded-lg border border-border bg-background">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
        {completedSteps.map((step) => (
          <TranscriptCompleted key={step} step={step} product={product} />
        ))}
        <TranscriptActive
          step={activeStep}
          product={product}
          onAdvance={(next) => onAdvanceAgent(product.id, next)}
        />
        {freeForm.map((msg) =>
          msg.from === 'agent' ? (
            <AgentMessage key={msg.id}>{msg.text}</AgentMessage>
          ) : (
            <UserMessage key={msg.id}>{msg.text}</UserMessage>
          ),
        )}
      </div>
      <ChatInput onSubmit={handleSubmit} />
    </div>
  )
}

function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-10 flex items-start gap-2 text-sm text-muted-foreground">
      <span className="mt-0.5 text-xs text-muted-foreground/60">You:</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function TranscriptCompleted({ step, product }: { step: SetupSubStep; product: Product }) {
  return (
    <div className="space-y-2 opacity-60">
      <AgentMessage>{scriptMessage(step, product)}</AgentMessage>
      <div className="ml-10 flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircleIcon weight="fill" className="size-3.5 text-success-muted-foreground" />
        {scriptUserConfirmation(step)}
      </div>
    </div>
  )
}

function TranscriptActive({
  step,
  product,
  onAdvance,
}: {
  step: SetupSubStep
  product: Product
  onAdvance: (next: SetupSubStep | 'complete') => void
}) {
  return (
    <div className="space-y-3">
      <AgentMessage>{scriptMessage(step, product)}</AgentMessage>
      <div className="ml-10">{renderStepAction(step, product, onAdvance)}</div>
    </div>
  )
}

function AgentMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-md bg-foreground/10">
        <SparkleIcon weight="duotone" className="size-4" />
      </div>
      <div className="flex-1 text-sm leading-relaxed">{children}</div>
    </div>
  )
}

function scriptMessage(step: SetupSubStep, product: Product): React.ReactNode {
  switch (step) {
    case 'welcome':
      return (
        <>
          Hi — I'm <strong>Riposte</strong>. I'll defend <strong>{product.name}</strong> against
          Stripe disputes. To do that I need access to your Stripe account and to your app's
          customer/activity data. Should we begin?
        </>
      )
    case 'connect_stripe':
      return (
        <>
          First, connect <strong>Stripe</strong>. I'll read your disputes and submit evidence on
          your behalf. I'll never charge or refund without your approval.
        </>
      )
    case 'connect_data':
      return (
        <>
          Now show me where your customer activity lives. I need to prove customers received the
          service they paid for — this is the part that wins fraud disputes. Where should I look?
        </>
      )
    case 'pick_dispute':
      return (
        <>
          Found <strong>3 disputes</strong> in the last 30 days. Let me practice on a real one to
          make sure I understand your data. The most recent fraudulent dispute will give the
          cleanest signal:
        </>
      )
    case 'dry_run':
      return (
        <>
          Running a dry-run on this dispute. I'll match the customer, pull their activity, draft the
          evidence text, and assemble a packet. No submission — this is just so you can review how I
          think.
        </>
      )
    case 'playbook_draft':
      return (
        <>
          Here's the <strong>playbook</strong> I built. This is what the runtime version of me will
          follow when a real dispute comes in. You can edit any section now, or re-upload later from
          the Playbook page.
        </>
      )
    default:
      return null
  }
}

function scriptUserConfirmation(step: SetupSubStep): string {
  switch (step) {
    case 'welcome':
      return "You: Let's start"
    case 'connect_stripe':
      return 'You: Stripe connected'
    case 'connect_data':
      return 'You: Postgres connected'
    case 'pick_dispute':
      return 'You: Use this dispute'
    case 'dry_run':
      return 'You: Looks good, build the playbook'
    case 'playbook_draft':
      return 'You: Approved playbook v1'
    default:
      return ''
  }
}

function renderStepAction(
  step: SetupSubStep,
  product: Product,
  onAdvance: (next: SetupSubStep | 'complete') => void,
): React.ReactNode {
  switch (step) {
    case 'welcome':
      return <PrimaryAction onClick={() => onAdvance('connect_stripe')} label="Let's start" />
    case 'connect_stripe':
      return <ConnectStripeAction onConnected={() => onAdvance('connect_data')} />
    case 'connect_data':
      return <ConnectDataAction onConnected={() => onAdvance('pick_dispute')} />
    case 'pick_dispute':
      return <PickDisputeAction onContinue={() => onAdvance('dry_run')} />
    case 'dry_run':
      return <DryRunAction onApprove={() => onAdvance('playbook_draft')} />
    case 'playbook_draft':
      return <PlaybookDraftAction product={product} onApprove={() => onAdvance('complete')} />
    default:
      return null
  }
}

function PrimaryAction({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
    >
      {label}
      <ArrowRightIcon className="size-3" />
    </button>
  )
}

function ConnectStripeAction({ onConnected }: { onConnected: () => void }) {
  return (
    <div className="bg-background-subtle rounded-lg border border-border p-4">
      <div className="mb-3 flex items-center gap-3">
        <CreditCardIcon weight="duotone" className="size-6" />
        <div>
          <div className="text-sm font-medium">Stripe</div>
          <div className="text-xs text-muted-foreground">
            Read disputes, charges, customers, invoices · submit evidence
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onConnected}
        className="rounded-md bg-[#635bff] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Connect with Stripe
      </button>
    </div>
  )
}

function ConnectDataAction({ onConnected }: { onConnected: () => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  const options: { value: string; label: string; icon: typeof DatabaseIcon }[] = [
    { value: 'postgres', label: 'Postgres', icon: DatabaseIcon },
    { value: 'supabase', label: 'Supabase', icon: DatabaseIcon },
    { value: 'rest', label: 'REST API', icon: CloudIcon },
    { value: 's3', label: 'S3 / R2 logs', icon: CloudIcon },
  ]
  return (
    <div className="bg-background-subtle rounded-lg border border-border p-4">
      {picked === null ? (
        <>
          <div className="mb-3 text-xs text-muted-foreground">
            Pick a data source — you can add more later.
          </div>
          <div className="grid grid-cols-2 gap-2">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPicked(opt.value)}
                className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-background"
              >
                <opt.icon weight="duotone" className="size-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-3">
            <DatabaseIcon weight="duotone" className="size-6" />
            <div>
              <div className="text-sm font-medium">
                {options.find((o) => o.value === picked)?.label ?? picked}
              </div>
              <div className="text-xs text-muted-foreground">
                Read-only access for customer matching and usage evidence
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onConnected}
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Authorize {options.find((o) => o.value === picked)?.label}
          </button>
        </>
      )}
    </div>
  )
}

function PickDisputeAction({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-3">
      <div className="bg-background-subtle rounded-lg border border-foreground/40 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs tracking-wider text-muted-foreground uppercase">
            Agent picked this one
          </span>
          <span className="text-xs text-muted-foreground">4d 12h until deadline</span>
        </div>
        <div className="mb-1 font-medium">acme@example.com</div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>$349</span>
          <span>·</span>
          <span>Fraudulent</span>
          <span>·</span>
          <span>du_acme_dryrun</span>
        </div>
      </div>
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div>Other recent disputes (skipped for dry-run):</div>
        <div className="rounded border border-dashed border-border px-3 py-1.5">
          northstar@example.com · $99 · Subscription canceled — out of MVP scope
        </div>
        <div className="rounded border border-dashed border-border px-3 py-1.5">
          atlas@example.com · $19 · Duplicate — needs human review
        </div>
      </div>
      <PrimaryAction onClick={onContinue} label="Use this dispute" />
    </div>
  )
}

function DryRunAction({ onApprove }: { onApprove: () => void }) {
  const steps = [
    {
      label: 'Listed tables in Postgres connection',
      detail: 'workspaces · users · sessions · usage_events',
    },
    {
      label: 'Matched customer to user_4f21',
      detail: 'workspaces.stripe_customer_id = cus_QrK… (1 row)',
    },
    {
      label: 'Pulled usage activity',
      detail: '37 sessions over 9 days · last_active 2 days before dispute',
    },
    {
      label: 'Composed access_activity_log',
      detail: '~340 chars · sourced from 4 queries',
    },
    {
      label: 'Composed uncategorized_text rebuttal',
      detail: '~190 chars · cites identity, IP match, usage history',
    },
    {
      label: 'Assembled evidence packet PDF',
      detail: 'Fraud Dispute Evidence · 3 pages · 1.2 MB',
    },
  ]
  return (
    <div className="space-y-3">
      <ol className="space-y-1.5">
        {steps.map((s) => (
          <li
            key={s.label}
            className="bg-background-subtle flex items-start gap-2 rounded-md px-3 py-2 text-xs"
          >
            <CheckCircleIcon
              weight="fill"
              className="mt-0.5 size-3.5 flex-shrink-0 text-success-foreground"
            />
            <div>
              <div className="font-medium text-foreground">{s.label}</div>
              <div className="text-muted-foreground">{s.detail}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="bg-background-subtle rounded-lg border border-border p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptIcon weight="duotone" className="size-5" />
            <span className="text-sm font-medium">du_acme_dryrun · evidence packet</span>
          </div>
          <span className="rounded bg-success-muted px-2 py-0.5 text-[10px] tracking-wider text-success-muted-foreground uppercase">
            high quality
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Preview only — nothing submitted to Stripe. Use this to validate the playbook before
          approving.
        </div>
      </div>
      <div className="flex gap-2">
        <PrimaryAction onClick={onApprove} label="Looks good, build the playbook" />
        <button
          type="button"
          className="hover:bg-background-subtle rounded-md border border-border px-3 py-2 text-sm"
        >
          Adjust
        </button>
      </div>
    </div>
  )
}

function PlaybookDraftAction({ product, onApprove }: { product: Product; onApprove: () => void }) {
  return (
    <div className="space-y-3">
      <div className="bg-background-subtle rounded-lg border border-border">
        <div className="border-b border-border bg-background px-4 py-2 text-xs text-muted-foreground">
          playbook.md · v1 draft
        </div>
        <div className="space-y-3 px-4 py-3 font-mono text-xs leading-relaxed">
          <div className="text-foreground"># {product.name} Dispute Playbook</div>
          <div className="text-muted-foreground">
            <div className="text-foreground">## How to match a customer</div>
            Look up `workspaces.stripe_customer_id` against Stripe's customer ID. Cross-check email
            on `users.email`.
          </div>
          <div className="text-muted-foreground">
            <div className="text-foreground">## Service start</div>
            Rule: <strong className="text-foreground">app_entitlement_started_at</strong>. Use{' '}
            <code>workspaces.plan_started_at</code> when present, fall back to{' '}
            <code>charge.created</code>.
          </div>
          <div className="text-muted-foreground">
            <div className="text-foreground">## How to prove service delivery</div>
            Pull `usage_events` for the workspace, count sessions, surface last 5 events with
            timestamps. Highlight any session within 48h of the dispute creation.
          </div>
          <div className="text-muted-foreground">
            <div className="text-foreground">## Refund and cancellation policy</div>
            Refund policy is disclosed at checkout and on /pricing. No refunds after first generated
            output. Cancellation closes the workspace immediately.
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <PrimaryAction onClick={onApprove} label="Approve playbook v1" />
        <button
          type="button"
          className="hover:bg-background-subtle rounded-md border border-border px-3 py-2 text-sm"
        >
          Try different dispute
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Want changes? Tell me below — e.g. "also check legacy_users table" or "rewrite the service
        delivery section to mention generated outputs"
      </p>
    </div>
  )
}

function ChatInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('')
  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setValue('')
  }
  return (
    <div className="bg-background-subtle border-t border-border px-6 py-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 focus-within:border-border-interactive"
      >
        <ChatCircleDotsIcon className="size-4 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask the agent — or click the action above to continue"
          aria-label="Message the agent"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="text-xs font-medium text-foreground disabled:text-muted-foreground/40"
        >
          Send
        </button>
      </form>
    </div>
  )
}

/**
 * Shared activity log. Same component renders on /agent and /disputes/:id.
 * Source of truth is one denormalized table (`agent_activity`); both views
 * pass the same data. Filtering, if ever needed, happens at the query layer.
 */
function ActivityFeed({
  entries,
  emptyTitle,
  emptyMessage,
  trailing,
}: {
  entries: AgentActivity[]
  emptyTitle?: string
  emptyMessage?: string
  trailing?: React.ReactNode
}) {
  if (entries.length === 0) {
    return (
      <div className="bg-background-subtle rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <SparkleIcon weight="duotone" className="mx-auto mb-3 size-8 opacity-60" />
        <div className="mb-1 font-medium">{emptyTitle ?? 'Agent is idle'}</div>
        <div className="text-sm text-muted-foreground">
          {emptyMessage ?? "As disputes come in, the agent's actions will appear here."}
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ChatCircleDotsIcon weight="duotone" className="size-4" />
          Activity
        </div>
        {trailing}
      </div>
      <ol className="divide-y divide-border">
        {entries.map((entry) => (
          <ActivityEntry key={entry.id} entry={entry} />
        ))}
      </ol>
    </div>
  )
}

function ActivityEntry({ entry }: { entry: AgentActivity }) {
  const Icon = activityIcon(entry.kind)
  const accent = activityAccent(entry.kind)
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <div
        className={`mt-0.5 flex size-7 flex-shrink-0 items-center justify-center rounded-md ${accent}`}
      >
        <Icon weight="duotone" className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">{entry.summary}</div>
          <div className="text-xs whitespace-nowrap text-muted-foreground">{entry.when}</div>
        </div>
        {entry.detail ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{entry.detail}</div>
        ) : null}
      </div>
    </li>
  )
}

function activityIcon(kind: AgentActivityKind): typeof ReceiptIcon {
  switch (kind) {
    case 'dispute_received':
      return ReceiptIcon
    case 'evidence_collected':
      return DatabaseIcon
    case 'packet_submitted':
      return CheckCircleIcon
    case 'connection_refreshed':
      return PlugsConnectedIcon
    case 'dispute_won':
      return TrophyIcon
    case 'evidence_low':
      return WarningIcon
    default:
      return CircleIcon
  }
}

function activityAccent(kind: AgentActivityKind): string {
  switch (kind) {
    case 'dispute_won':
      return 'bg-success-muted text-success-muted-foreground'
    case 'evidence_low':
      return 'bg-warning-muted text-warning-muted-foreground'
    case 'packet_submitted':
      return 'bg-success-muted text-success-muted-foreground'
    default:
      return 'bg-muted text-foreground'
  }
}

/* -------------------------------------------------------------------------- *
 * Workflow timeline (mirrors dispute-agent-workflow.ts steps)
 * -------------------------------------------------------------------------- */

const WORKFLOW_STEP_ORDER: WorkflowStepKey[] = [
  'triage',
  'enrich',
  'collect_evidence',
  'generate_packet',
  'submission_decision',
  'submit_response',
  'outcome',
]

const WORKFLOW_STEP_LABELS: Record<WorkflowStepKey, string> = {
  triage: 'Triage',
  enrich: 'Enrich',
  collect_evidence: 'Collect evidence',
  generate_packet: 'Build packet',
  submission_decision: 'Decide',
  submit_response: 'Submit',
  outcome: 'Outcome',
}

function WorkflowTimeline({
  steps,
  compact = false,
}: {
  steps: WorkflowStep[]
  compact?: boolean
}) {
  return (
    <ol className={`flex items-stretch gap-1 ${compact ? 'text-xs' : 'text-sm'}`}>
      {steps.map((step, idx) => (
        <li key={step.key} className="flex flex-1 items-center gap-1">
          <WorkflowNode step={step} compact={compact} />
          {idx < steps.length - 1 ? (
            <div
              className={`h-px flex-1 ${step.state === 'done' ? 'bg-foreground/40' : 'bg-border'}`}
            />
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function WorkflowNode({ step, compact }: { step: WorkflowStep; compact: boolean }) {
  const stateStyle: Record<WorkflowStepState, string> = {
    pending: 'border-border bg-background text-muted-foreground/60',
    active: 'border-foreground bg-background text-foreground',
    done: 'border-success-muted bg-success-muted text-success-muted-foreground',
    failed: 'border-destructive-muted bg-destructive-muted text-destructive-muted-foreground',
    skipped: 'border-dashed border-border bg-background text-muted-foreground/60',
  }
  return (
    <div
      className={`flex flex-col items-start gap-0.5 rounded-md border px-2 py-1 ${stateStyle[step.state]}`}
      title={step.detail}
    >
      <div className="flex items-center gap-1.5">
        {step.state === 'done' ? (
          <CheckCircleIcon weight="fill" className="size-3" />
        ) : step.state === 'active' ? (
          <CircleIcon weight="fill" className="size-3 animate-pulse" />
        ) : step.state === 'failed' ? (
          <WarningIcon weight="fill" className="size-3" />
        ) : (
          <CircleIcon className="size-3" />
        )}
        <span className={compact ? 'text-[11px]' : 'text-xs'}>{step.label}</span>
      </div>
      {!compact && step.detail ? (
        <span className="text-[10px] text-muted-foreground">{step.detail}</span>
      ) : null}
    </div>
  )
}

function mockLiveWorkflowSteps(): WorkflowStep[] {
  return WORKFLOW_STEP_ORDER.map((k) => {
    const label = WORKFLOW_STEP_LABELS[k]
    if (k === 'triage') return { key: k, label, state: 'done', detail: 'Fraudulent · contestable' }
    if (k === 'enrich')
      return { key: k, label, state: 'done', detail: 'Charge + customer + IP loaded' }
    if (k === 'collect_evidence')
      return { key: k, label, state: 'active', detail: 'Postgres query 2 / 4' }
    return { key: k, label, state: 'pending' }
  })
}

function mockCompletedWorkflowSteps(): WorkflowStep[] {
  return WORKFLOW_STEP_ORDER.map((k) => {
    const label = WORKFLOW_STEP_LABELS[k]
    if (k === 'outcome')
      return { key: k, label, state: 'pending', detail: 'Awaiting Stripe outcome' }
    return { key: k, label, state: 'done' }
  })
}

/* -------------------------------------------------------------------------- *
 * Dispute detail page
 * -------------------------------------------------------------------------- */

function DisputeDetail({
  product,
  disputeId,
  onNavigate,
}: {
  product: Product
  disputeId: string
  onNavigate: (r: Route) => void
}) {
  // For sketch purposes, find a matching dispute from the sample set or fabricate one
  const dispute = sampleDisputes.find((d) => d.id === disputeId) ?? sampleDisputes[0]
  const isLive =
    product.agentMode.kind === 'handling' && product.agentMode.disputeCaseId === disputeId
  const steps = isLive ? mockLiveWorkflowSteps() : mockCompletedWorkflowSteps()

  if (!dispute) return null

  return (
    <div className="space-y-5">
      <DisputeHeader dispute={dispute} onNavigate={onNavigate} product={product} />
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">Workflow</div>
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CircleIcon
                weight="fill"
                className="size-2 animate-pulse text-success-muted-foreground"
              />
              Live
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Last run · 2 min ago</span>
          )}
        </div>
        <WorkflowTimeline steps={steps} />
      </div>
      <ActivityFeed entries={product.agentActivity} />
    </div>
  )
}

function DisputeHeader({
  dispute,
  product,
  onNavigate,
}: {
  dispute: DisputeCase
  product: Product
  onNavigate: (r: Route) => void
}) {
  const qualityStyle: Record<EvidenceQuality, string> = {
    high: 'bg-success-muted text-success-muted-foreground',
    medium: 'bg-warning-muted text-warning-muted-foreground',
    low: 'bg-destructive-muted text-destructive-muted-foreground',
  }
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => onNavigate({ name: 'product_disputes', productId: product.id })}
              className="hover:text-foreground"
            >
              ← All disputes
            </button>
          </div>
          <h1 className="mt-1 text-2xl font-semibold">{dispute.id}</h1>
          <p className="text-sm text-muted-foreground">
            {dispute.reason} · {dispute.customer} · due in {dispute.dueIn}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg">${(dispute.amount / 100).toFixed(0)}</span>
          <span
            className={`rounded px-2 py-0.5 text-[10px] tracking-wider uppercase ${qualityStyle[dispute.evidenceQuality]}`}
          >
            evidence {dispute.evidenceQuality}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="hover:bg-primary-hover inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background"
        >
          Approve & submit
        </button>
        <button
          type="button"
          className="hover:bg-background-subtle rounded-md border border-border px-3 py-1.5 text-sm"
        >
          Packet preview
        </button>
        <button
          type="button"
          className="hover:bg-background-subtle rounded-md border border-border px-3 py-1.5 text-sm"
        >
          Decline
        </button>
      </div>
    </div>
  )
}

function AgentHandlingView({
  product,
  onNavigate,
}: {
  product: Product
  onNavigate: (r: Route) => void
}) {
  if (product.agentMode.kind !== 'handling') return null
  const id = product.agentMode.disputeCaseId
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-foreground/40 bg-foreground/5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <CircleIcon weight="fill" className="size-3 text-success-muted-foreground" />
            Defending {id} · live
          </div>
          <button
            type="button"
            onClick={() =>
              onNavigate({
                name: 'product_dispute_detail',
                productId: product.id,
                disputeId: id,
              })
            }
            className="inline-flex items-center gap-1 text-sm font-medium hover:opacity-80"
          >
            View dispute
            <ArrowRightIcon className="size-3" />
          </button>
        </div>
        <WorkflowTimeline steps={mockLiveWorkflowSteps()} compact />
      </div>
      <ActivityFeed entries={product.agentActivity} />
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
}: {
  label: string
  value: string
  icon: typeof CheckCircleIcon
  variant?: 'default' | 'warn'
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon
          weight="duotone"
          className={`size-4 ${variant === 'warn' ? 'text-warning-foreground' : ''}`}
        />
        {label}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}

function EmptyStateInline({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ReceiptIcon
  title: string
  description: string
}) {
  return (
    <div className="bg-background-subtle rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <Icon weight="duotone" className="mx-auto mb-3 size-8 opacity-60" />
      <div className="mb-1 font-medium">{title}</div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </div>
  )
}

function AutopilotCard() {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <ShieldCheckIcon weight="duotone" className="size-5" />
        Autopilot
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Current mode keeps all Stripe-facing actions behind founder review.
      </p>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border p-3">
          <div className="text-xs text-muted-foreground">Mode</div>
          <div className="text-sm font-medium">Review before submit</div>
        </div>
        <div className="rounded-md border border-border p-3">
          <div className="text-xs text-muted-foreground">Review queue</div>
          <div className="text-sm font-medium">1 packet</div>
        </div>
      </div>
      <button
        type="button"
        className="w-full rounded-md bg-foreground/5 px-3 py-2 text-sm font-medium hover:bg-foreground/10"
      >
        Edit autopilot
      </button>
    </div>
  )
}

function SystemHealthCard() {
  const rows: Array<{ label: string; status: 'ready' | 'warn'; value: string }> = [
    { label: 'Stripe connection', status: 'ready', value: 'Ready' },
    { label: 'Last Stripe sync', status: 'ready', value: '12 min ago' },
    { label: 'Webhook ingestion', status: 'ready', value: 'Ready' },
    { label: 'App database', status: 'warn', value: 'Not configured' },
  ]
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="mb-1 flex items-center gap-2 font-semibold">
        <GaugeIcon weight="duotone" className="size-5" />
        System health
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Connection and ingestion readiness</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="bg-background-subtle flex items-center justify-between rounded-md px-3 py-2 text-sm"
          >
            <span>{row.label}</span>
            <span
              className={`text-xs font-medium ${
                row.status === 'warn' ? 'text-warning-foreground' : 'text-success-foreground'
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function DisputesList({
  product,
  onOpenDispute,
}: {
  product: Product
  onOpenDispute: (disputeId: string) => void
}) {
  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Disputes</h1>
        <p className="text-sm text-muted-foreground">All disputes for {product.name}</p>
      </div>
      <div className="rounded-lg border border-border bg-background">
        <div className="grid grid-cols-12 gap-4 border-b border-border px-5 py-3 text-xs tracking-wider text-muted-foreground uppercase">
          <div className="col-span-3">Customer</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Due</div>
          <div className="col-span-2">Evidence</div>
          <div className="col-span-3 text-right">Action</div>
        </div>
        <div className="divide-y divide-border">
          {sampleDisputes.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onOpenDispute(d.id)}
              className="hover:bg-background-subtle grid w-full grid-cols-12 items-center gap-4 px-5 py-3 text-left text-sm"
            >
              <div className="col-span-3">
                <div className="font-medium">{d.customer}</div>
                <div className="text-xs text-muted-foreground">{d.reason}</div>
              </div>
              <div className="col-span-2 font-mono">${(d.amount / 100).toFixed(0)}</div>
              <div className="col-span-2 font-mono text-xs text-muted-foreground">{d.dueIn}</div>
              <div className="col-span-2">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-[10px] tracking-wider uppercase ${
                    d.evidenceQuality === 'high'
                      ? 'bg-success-muted text-success-muted-foreground'
                      : d.evidenceQuality === 'medium'
                        ? 'bg-warning-muted text-warning-muted-foreground'
                        : 'bg-destructive-muted text-destructive-muted-foreground'
                  }`}
                >
                  {d.evidenceQuality}
                </span>
              </div>
              <div className="col-span-3 text-right">
                <span className="text-xs text-muted-foreground">{d.action} →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConnectionsPage({
  product,
  connections,
  onToggle,
}: {
  product: Product
  connections: Connection[]
  onToggle: (kind: Connection['kind']) => void
}) {
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Connections</h1>
        <p className="text-sm text-muted-foreground">
          External systems Riposte uses to defend disputes for {product.name}
        </p>
      </div>
      <div className="space-y-3">
        {connections.map((c) => (
          <ConnectionRow key={c.kind} connection={c} onToggle={() => onToggle(c.kind)} />
        ))}
      </div>
    </div>
  )
}

function ConnectionRow({ connection, onToggle }: { connection: Connection; onToggle: () => void }) {
  const Icon = connection.kind === 'stripe' ? CreditCardIcon : DatabaseIcon
  const stateStyles: Record<ConnectionState, string> = {
    ready: 'bg-success/20 text-success-foreground',
    needs_input: 'bg-warning/20 text-warning-foreground',
    not_configured: 'bg-muted text-muted-foreground',
    error: 'bg-destructive/20 text-destructive-foreground',
  }
  const stateLabel: Record<ConnectionState, string> = {
    ready: 'Ready',
    needs_input: 'Needs input',
    not_configured: 'Not configured',
    error: 'Error',
  }
  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-background p-4">
      <Icon weight="duotone" className="mt-0.5 size-6" />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="font-medium">{connection.label}</span>
          <span
            className={`rounded px-2 py-0.5 text-[10px] tracking-wider uppercase ${stateStyles[connection.state]}`}
          >
            {stateLabel[connection.state]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{connection.detail}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="hover:bg-background-subtle rounded-md border border-border px-3 py-1.5 text-xs whitespace-nowrap"
      >
        {connection.state === 'ready' ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  )
}

function StubPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="mt-8 rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
        Mock page — not part of the IA flows being sketched
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- *
 * Stories
 * -------------------------------------------------------------------------- */

function FlowSandbox({
  initialProducts,
  initialRoute,
  initialConnections,
}: {
  initialProducts: Product[]
  initialRoute: Route
  initialConnections?: Connection[]
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [route, setRoute] = useState<Route>(initialRoute)
  const [connections, setConnections] = useState<Connection[]>(
    initialConnections ?? STRIPE_NEEDS_DB,
  )
  const currentProductId: ProductId | null =
    'productId' in route ? route.productId : (products[0]?.id ?? null)

  const onAdvanceAgent = (productId: ProductId, next: SetupSubStep | 'complete') => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p
        if (p.agentMode.kind !== 'setup') return p
        const leaving = p.agentMode.step

        const setupKeyDone: SetupStepKey | null =
          leaving === 'connect_stripe'
            ? 'stripe'
            : leaving === 'connect_data'
              ? 'database'
              : leaving === 'playbook_draft'
                ? 'playbook'
                : null

        let nextSetup = p.setup
        if (setupKeyDone) {
          nextSetup = p.setup.map((s) =>
            s.key === setupKeyDone ? { ...s, status: 'done' as const } : s,
          )
          let unblocked = false
          nextSetup = nextSetup.map((s) => {
            if (!unblocked && s.status === 'blocked') {
              unblocked = true
              return { ...s, status: 'pending' as const, action: undefined }
            }
            return s
          })
        }

        const allDone = nextSetup.every((s) => s.status === 'done')
        const newMode: AgentMode =
          next === 'complete' ? { kind: 'idle' } : { kind: 'setup', step: next }

        return {
          ...p,
          setup: nextSetup,
          agentMode: newMode,
          status: allDone ? ('setup_complete' as const) : p.status,
        }
      }),
    )

    if (next === 'connect_data') {
      setConnections((prev) =>
        prev.map((c) => (c.kind === 'stripe' ? { ...c, state: 'ready' as const } : c)),
      )
    }
    if (next === 'pick_dispute') {
      setConnections((prev) =>
        prev.map((c) => (c.kind === 'postgres' ? { ...c, state: 'ready' as const } : c)),
      )
    }
  }

  const onToggleConnection = (kind: Connection['kind']) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.kind === kind
          ? { ...c, state: c.state === 'ready' ? ('not_configured' as const) : ('ready' as const) }
          : c,
      ),
    )
  }

  return (
    <Shell
      products={products}
      currentProductId={currentProductId}
      onSwitchProduct={() => undefined}
      route={route}
      onNavigate={setRoute}
    >
      {renderRoute({
        route,
        products,
        connections,
        onNavigate: setRoute,
        onCreateProduct: (input) => {
          const newId: ProductId = `product_${Math.random().toString(36).slice(2, 7)}`
          const newProduct: Product = {
            id: newId,
            name: input.name,
            url: input.url,
            status: 'setup_pending',
            pendingDisputes: 0,
            setup: [
              { key: 'product_info', label: 'Product info', status: 'done' },
              { key: 'stripe', label: 'Stripe connection', status: 'pending' },
              { key: 'database', label: 'App data', status: 'blocked' },
              { key: 'playbook', label: 'Playbook', status: 'blocked' },
            ],
            agentMode: { kind: 'setup', step: 'welcome' },
            agentActivity: [],
          }
          setProducts((prev) => [...prev, newProduct])
          setRoute({ name: 'product_dashboard', productId: newId })
        },
        onAdvanceAgent,
        onToggleConnection,
      })}
    </Shell>
  )
}

function renderRoute({
  route,
  products,
  connections,
  onNavigate,
  onCreateProduct,
  onAdvanceAgent,
  onToggleConnection,
}: {
  route: Route
  products: Product[]
  connections: Connection[]
  onNavigate: (r: Route) => void
  onCreateProduct: (input: { name: string; url: string }) => void
  onAdvanceAgent: (productId: ProductId, next: SetupSubStep | 'complete') => void
  onToggleConnection: (kind: Connection['kind']) => void
}) {
  switch (route.name) {
    case 'products_list':
      return (
        <ProductsList
          products={products}
          onSelect={(id) => onNavigate({ name: 'product_dashboard', productId: id })}
          onCreate={() => onNavigate({ name: 'products_new' })}
        />
      )
    case 'products_new':
      return (
        <ProductCreateForm
          onCancel={() => onNavigate({ name: 'products_list' })}
          onCreate={onCreateProduct}
        />
      )
    case 'product_dashboard': {
      const product = products.find((p) => p.id === route.productId)
      if (!product) return null
      return <ProductDashboard product={product} onNavigate={onNavigate} />
    }
    case 'product_agent': {
      const product = products.find((p) => p.id === route.productId)
      if (!product) return null
      return <AgentPage product={product} onAdvanceAgent={onAdvanceAgent} onNavigate={onNavigate} />
    }
    case 'product_disputes': {
      const product = products.find((p) => p.id === route.productId)
      if (!product) return null
      return (
        <DisputesList
          product={product}
          onOpenDispute={(disputeId) =>
            onNavigate({ name: 'product_dispute_detail', productId: product.id, disputeId })
          }
        />
      )
    }
    case 'product_dispute_detail': {
      const product = products.find((p) => p.id === route.productId)
      if (!product) return null
      return <DisputeDetail product={product} disputeId={route.disputeId} onNavigate={onNavigate} />
    }
    case 'product_playbook': {
      const product = products.find((p) => p.id === route.productId)
      if (!product) return null
      return (
        <StubPage
          title="Playbook"
          description={`Markdown playbook for ${product.name} (out of scope for this sketch)`}
        />
      )
    }
    case 'product_connections': {
      const product = products.find((p) => p.id === route.productId)
      if (!product) return null
      return (
        <ConnectionsPage
          product={product}
          connections={connections}
          onToggle={onToggleConnection}
        />
      )
    }
    case 'product_info': {
      const product = products.find((p) => p.id === route.productId)
      if (!product) return null
      return (
        <StubPage
          title="Product info"
          description={`Stripe-submittable fields: description, service-start rule, refund + cancellation policy disclosures for ${product.name}`}
        />
      )
    }
    case 'settings_billing':
      return <StubPage title="Billing" description="Subscription and invoices" />
    case 'settings_notifications':
      return <StubPage title="Notifications" description="Slack + email recipients" />
    default:
      return null
  }
}

/* -------------------------------------------------------------------------- *
 * Story exports
 * -------------------------------------------------------------------------- */

const EMPTY_PRODUCTS: Product[] = []

export const Flow1_EmptyToOnboarding: Story = {
  name: '1. Empty → Onboarding',
  render: () => (
    <FlowSandbox initialProducts={EMPTY_PRODUCTS} initialRoute={{ name: 'products_list' }} />
  ),
}

export const Flow2_NotSetupToSetup: Story = {
  name: '2. Not setup → Setup',
  render: () => (
    <FlowSandbox
      initialProducts={ONLY_SPAWNBASE}
      initialRoute={{ name: 'product_dashboard', productId: 'spawnbase' }}
      initialConnections={STRIPE_NEEDS_DB}
    />
  ),
}

export const Flow3_FightingDisputes: Story = {
  name: '3. Fighting disputes',
  render: () => (
    <FlowSandbox
      initialProducts={TYPIST_AND_SPAWNBASE}
      initialRoute={{ name: 'product_dashboard', productId: 'typist' }}
      initialConnections={ALL_READY}
    />
  ),
}

export const Flow4_ManagingConnections: Story = {
  name: '4. Managing connections',
  render: () => (
    <FlowSandbox
      initialProducts={TYPIST_AND_SPAWNBASE}
      initialRoute={{ name: 'product_connections', productId: 'typist' }}
      initialConnections={CONNECTIONS_WITH_DETAILS}
    />
  ),
}

/* -------------------------------------------------------------------------- *
 * Agent-focused state variants
 * -------------------------------------------------------------------------- */

const STRIPE_AND_DATA_READY: Connection[] = [
  {
    kind: 'stripe',
    label: 'Stripe',
    detail: 'Disputes, charges, customers',
    state: 'ready',
  },
  {
    kind: 'postgres',
    label: 'Postgres (Neon)',
    detail: 'Read-only, customer + usage tables',
    state: 'ready',
  },
]

const NOTHING_CONNECTED: Connection[] = [
  {
    kind: 'stripe',
    label: 'Stripe',
    detail: 'Disputes, charges, customers',
    state: 'not_configured',
  },
  {
    kind: 'postgres',
    label: 'Postgres (Neon)',
    detail: 'Read-only access for customer + usage',
    state: 'not_configured',
  },
]

export const Flow5_OnboardingWelcome: Story = {
  name: '5. Agent — onboarding: welcome',
  render: () => (
    <FlowSandbox
      initialProducts={[
        makeProduct('spawnbase', {
          setup: [
            { key: 'product_info', label: 'Product info', status: 'done' },
            { key: 'stripe', label: 'Stripe connection', status: 'pending' },
            { key: 'database', label: 'App data', status: 'blocked' },
            { key: 'playbook', label: 'Playbook', status: 'blocked' },
          ],
          agentMode: { kind: 'setup', step: 'welcome' },
        }),
      ]}
      initialRoute={{ name: 'product_agent', productId: 'spawnbase' }}
      initialConnections={NOTHING_CONNECTED}
    />
  ),
}

export const Flow6_OnboardingPickDispute: Story = {
  name: '6. Agent — onboarding: pick dispute',
  render: () => (
    <FlowSandbox
      initialProducts={[
        makeProduct('spawnbase', {
          setup: [
            { key: 'product_info', label: 'Product info', status: 'done' },
            { key: 'stripe', label: 'Stripe connection', status: 'done' },
            { key: 'database', label: 'App data', status: 'done' },
            { key: 'playbook', label: 'Playbook', status: 'pending' },
          ],
          agentMode: { kind: 'setup', step: 'pick_dispute' },
        }),
      ]}
      initialRoute={{ name: 'product_agent', productId: 'spawnbase' }}
      initialConnections={STRIPE_AND_DATA_READY}
    />
  ),
}

export const Flow7_OnboardingReview: Story = {
  name: '7. Agent — onboarding: review',
  render: () => (
    <FlowSandbox
      initialProducts={[
        makeProduct('spawnbase', {
          setup: [
            { key: 'product_info', label: 'Product info', status: 'done' },
            { key: 'stripe', label: 'Stripe connection', status: 'done' },
            { key: 'database', label: 'App data', status: 'done' },
            { key: 'playbook', label: 'Playbook', status: 'pending' },
          ],
          agentMode: { kind: 'setup', step: 'playbook_draft' },
        }),
      ]}
      initialRoute={{ name: 'product_agent', productId: 'spawnbase' }}
      initialConnections={STRIPE_AND_DATA_READY}
    />
  ),
}

export const Flow8_ActiveJustCompleted: Story = {
  name: '8. Agent — active: just completed',
  render: () => (
    <FlowSandbox
      initialProducts={[
        makeProduct('spawnbase', {
          status: 'setup_complete',
          pendingDisputes: 0,
          setup: [
            { key: 'product_info', label: 'Product info', status: 'done' },
            { key: 'stripe', label: 'Stripe connection', status: 'done' },
            { key: 'database', label: 'App data', status: 'done' },
            { key: 'playbook', label: 'Playbook', status: 'done' },
          ],
          agentMode: { kind: 'idle' },
          agentActivity: [],
        }),
      ]}
      initialRoute={{ name: 'product_agent', productId: 'spawnbase' }}
      initialConnections={STRIPE_AND_DATA_READY}
    />
  ),
}

export const Flow9_ActiveHandlingLive: Story = {
  name: '9. Agent — active: handling live dispute',
  render: () => (
    <FlowSandbox
      initialProducts={[
        makeProduct('typist', {
          agentMode: { kind: 'handling', disputeCaseId: 'du_acme' },
        }),
      ]}
      initialRoute={{ name: 'product_agent', productId: 'typist' }}
      initialConnections={CONNECTIONS_WITH_DETAILS}
    />
  ),
}

export const Flow10_DisputeDetailLive: Story = {
  name: '10. Dispute detail — live workflow',
  render: () => (
    <FlowSandbox
      initialProducts={[
        makeProduct('typist', {
          agentMode: { kind: 'handling', disputeCaseId: 'du_acme' },
        }),
      ]}
      initialRoute={{
        name: 'product_dispute_detail',
        productId: 'typist',
        disputeId: 'du_acme',
      }}
      initialConnections={CONNECTIONS_WITH_DETAILS}
    />
  ),
}

export const Flow11_DisputeDetailCompleted: Story = {
  name: '11. Dispute detail — completed workflow',
  render: () => (
    <FlowSandbox
      initialProducts={[makeProduct('typist')]}
      initialRoute={{
        name: 'product_dispute_detail',
        productId: 'typist',
        disputeId: 'du_acme',
      }}
      initialConnections={ALL_READY}
    />
  ),
}
