import {
  ArrowRightIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckCircleIcon,
  CircleIcon,
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

type ProductId = string

type Product = {
  id: ProductId
  name: string
  url: string
  status: 'setup_pending' | 'setup_complete' | 'disabled'
  pendingDisputes: number
  setup: SetupStep[]
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
  | { name: 'product_disputes'; productId: ProductId }
  | { name: 'product_playbook'; productId: ProductId }
  | { name: 'product_connections'; productId: ProductId }
  | { name: 'product_info'; productId: ProductId }
  | { name: 'settings_billing' }
  | { name: 'settings_notifications' }

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
        { key: 'database', label: 'Database connection', status: 'done' },
        { key: 'playbook', label: 'Playbook', status: 'done' },
      ],
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
          label: 'Database connection',
          status: 'pending',
          action: 'Connect Postgres',
        },
        { key: 'playbook', label: 'Playbook', status: 'blocked', action: 'Connect database first' },
      ],
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
          label: 'Database connection',
          status: 'blocked',
          action: 'Connect Stripe first',
        },
        { key: 'playbook', label: 'Playbook', status: 'blocked', action: 'Connect Stripe first' },
      ],
    },
  }
  return { ...defaults[id], ...overrides }
}

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
            icon={ScrollIcon}
            label="Playbook"
            active={route.name === 'product_playbook'}
            onClick={() => onNavigate({ name: 'product_playbook', productId: currentProduct.id })}
          />
        </NavSection>
      ) : null}

      {inProductContext && currentProduct ? (
        <NavSection label="Setup">
          <NavItem
            icon={PlugsConnectedIcon}
            label="Connections"
            active={route.name === 'product_connections'}
            onClick={() =>
              onNavigate({ name: 'product_connections', productId: currentProduct.id })
            }
          />
          <NavItem
            icon={PackageIcon}
            label="Product info"
            active={route.name === 'product_info'}
            onClick={() => onNavigate({ name: 'product_info', productId: currentProduct.id })}
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
  badge?: number
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
    case 'product_disputes':
    case 'product_playbook':
    case 'product_connections':
    case 'product_info': {
      const product = products.find((p) => p.id === route.productId)
      const productName = product?.name ?? 'Product'
      const pageLabel = {
        product_dashboard: 'Dashboard',
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
  onAdvanceSetup,
}: {
  product: Product
  onNavigate: (r: Route) => void
  onAdvanceSetup: (key: SetupStepKey) => void
}) {
  const allDone = product.setup.every((s) => s.status === 'done')

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-sm text-muted-foreground">{product.url}</p>
        </div>
      </div>

      {!allDone ? <SetupChecklistCard product={product} onAdvance={onAdvanceSetup} /> : null}

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

function SetupChecklistCard({
  product,
  onAdvance,
}: {
  product: Product
  onAdvance: (key: SetupStepKey) => void
}) {
  const doneCount = product.setup.filter((s) => s.status === 'done').length
  const totalCount = product.setup.length
  const ratio = doneCount / totalCount

  return (
    <div className="rounded-lg border border-warning/40 bg-warning/5 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <WarningIcon weight="duotone" className="size-5" />
            Setup not complete
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Riposte won't auto-defend disputes until setup is complete.
          </p>
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
          {doneCount} of {totalCount}
        </span>
      </div>

      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div className="h-full bg-foreground" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </div>

      <div className="space-y-2">
        {product.setup.map((step) => (
          <div
            key={step.key}
            className="hover:bg-background-subtle flex items-center justify-between gap-4 rounded-md px-3 py-2"
          >
            <div className="flex items-center gap-3">
              {step.status === 'done' ? (
                <CheckCircleIcon weight="fill" className="size-5 text-success-foreground" />
              ) : step.status === 'pending' ? (
                <CircleIcon className="size-5 text-foreground" />
              ) : (
                <CircleIcon className="size-5 text-muted-foreground/40" />
              )}
              <span
                className={`text-sm ${step.status === 'blocked' ? 'text-muted-foreground/60' : ''}`}
              >
                {step.label}
              </span>
            </div>
            {step.action && step.status === 'pending' ? (
              <button
                type="button"
                onClick={() => onAdvance(step.key)}
                className="inline-flex items-center gap-1 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
              >
                {step.action}
                <ArrowRightIcon className="size-3" />
              </button>
            ) : step.status === 'blocked' && step.action ? (
              <span className="text-xs text-muted-foreground">{step.action}</span>
            ) : null}
          </div>
        ))}
      </div>
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

function DisputesList({ product }: { product: Product }) {
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
            <div key={d.id} className="grid grid-cols-12 items-center gap-4 px-5 py-3 text-sm">
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

  const onAdvanceSetup = (productId: ProductId, key: SetupStepKey) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p
        const setup: SetupStep[] = p.setup.map((s) =>
          s.key === key ? { ...s, status: 'done' as const } : s,
        )
        let unblocked = false
        const unblockedSetup: SetupStep[] = []
        for (const s of setup) {
          if (!unblocked && s.status === 'blocked') {
            unblocked = true
            unblockedSetup.push({ ...s, status: 'pending', action: defaultActionFor(s.key) })
          } else {
            unblockedSetup.push(s)
          }
        }
        const allDone = unblockedSetup.every((s) => s.status === 'done')
        return {
          ...p,
          setup: unblockedSetup,
          status: allDone ? ('setup_complete' as const) : p.status,
        }
      }),
    )
    // mirror to connections state when the user advances Stripe / DB
    if (key === 'stripe') {
      setConnections((prev) =>
        prev.map((c) => (c.kind === 'stripe' ? { ...c, state: 'ready' as const } : c)),
      )
    }
    if (key === 'database') {
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
              {
                key: 'stripe',
                label: 'Stripe connection',
                status: 'pending',
                action: 'Connect Stripe',
              },
              {
                key: 'database',
                label: 'Database connection',
                status: 'blocked',
                action: 'Connect Stripe first',
              },
              {
                key: 'playbook',
                label: 'Playbook',
                status: 'blocked',
                action: 'Connect database first',
              },
            ],
          }
          setProducts((prev) => [...prev, newProduct])
          setRoute({ name: 'product_dashboard', productId: newId })
        },
        onAdvanceSetup,
        onToggleConnection,
      })}
    </Shell>
  )
}

function defaultActionFor(key: SetupStepKey): string {
  switch (key) {
    case 'stripe':
      return 'Connect Stripe'
    case 'database':
      return 'Connect Postgres'
    case 'playbook':
      return 'Build playbook'
    default:
      return 'Continue'
  }
}

function renderRoute({
  route,
  products,
  connections,
  onNavigate,
  onCreateProduct,
  onAdvanceSetup,
  onToggleConnection,
}: {
  route: Route
  products: Product[]
  connections: Connection[]
  onNavigate: (r: Route) => void
  onCreateProduct: (input: { name: string; url: string }) => void
  onAdvanceSetup: (productId: ProductId, key: SetupStepKey) => void
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
      return (
        <ProductDashboard
          product={product}
          onNavigate={onNavigate}
          onAdvanceSetup={(key) => onAdvanceSetup(product.id, key)}
        />
      )
    }
    case 'product_disputes': {
      const product = products.find((p) => p.id === route.productId)
      if (!product) return null
      return <DisputesList product={product} />
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
