import type { IconWeight } from '@phosphor-icons/react'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  XIcon,
  CheckIcon,
  CaretDownIcon,
  CaretRightIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  TrashIcon,
  CopyIcon,
  DownloadIcon,
  UploadIcon,
  FunnelIcon,
  GearIcon,
  BellIcon,
  UserIcon,
  SignOutIcon,
  HouseIcon,
  WarningIcon,
  InfoIcon,
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  LightningIcon,
  PulseIcon,
  TargetIcon,
  FileTextIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  CalendarIcon,
  ClockIcon,
  ArrowClockwiseIcon,
} from '@phosphor-icons/react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '@web/ui/components/ui/badge'
import { Button } from '@web/ui/components/ui/button'
import type { ComponentType, ReactNode } from 'react'

const meta: Meta = {
  title: 'Design System/Iconography',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

type IconEntry = {
  name: string
  icon: ComponentType<{ className?: string; weight?: IconWeight; size?: number }>
}

function IconCell({ entry, weight = 'regular' }: { entry: IconEntry; weight?: IconWeight }) {
  return (
    <div className="flex flex-col items-center gap-2 border bg-surface p-3">
      <entry.icon size={20} weight={weight} />
      <code className="text-center text-xs text-muted-foreground">{entry.name}</code>
    </div>
  )
}

const icons: IconEntry[] = [
  { name: 'XIcon', icon: XIcon },
  { name: 'CheckIcon', icon: CheckIcon },
  { name: 'PlusIcon', icon: PlusIcon },
  { name: 'CaretDownIcon', icon: CaretDownIcon },
  { name: 'CaretRightIcon', icon: CaretRightIcon },
  { name: 'DotsThreeIcon', icon: DotsThreeIcon },
  { name: 'MagnifyingGlassIcon', icon: MagnifyingGlassIcon },
  { name: 'FunnelIcon', icon: FunnelIcon },
  { name: 'PencilSimpleIcon', icon: PencilSimpleIcon },
  { name: 'TrashIcon', icon: TrashIcon },
  { name: 'CopyIcon', icon: CopyIcon },
  { name: 'DownloadIcon', icon: DownloadIcon },
  { name: 'UploadIcon', icon: UploadIcon },
  { name: 'EyeIcon', icon: EyeIcon },
  { name: 'EyeSlashIcon', icon: EyeSlashIcon },
  { name: 'HouseIcon', icon: HouseIcon },
  { name: 'GearIcon', icon: GearIcon },
  { name: 'BellIcon', icon: BellIcon },
  { name: 'UserIcon', icon: UserIcon },
  { name: 'SignOutIcon', icon: SignOutIcon },
  { name: 'CheckCircleIcon', icon: CheckCircleIcon },
  { name: 'XCircleIcon', icon: XCircleIcon },
  { name: 'WarningIcon', icon: WarningIcon },
  { name: 'InfoIcon', icon: InfoIcon },
  { name: 'ArrowClockwiseIcon', icon: ArrowClockwiseIcon },
  { name: 'ShieldCheckIcon', icon: ShieldCheckIcon },
  { name: 'LightningIcon', icon: LightningIcon },
  { name: 'PulseIcon', icon: PulseIcon },
  { name: 'TargetIcon', icon: TargetIcon },
  { name: 'FileTextIcon', icon: FileTextIcon },
  { name: 'KeyIcon', icon: KeyIcon },
  { name: 'CurrencyDollarIcon', icon: CurrencyDollarIcon },
  { name: 'CreditCardIcon', icon: CreditCardIcon },
  { name: 'CalendarIcon', icon: CalendarIcon },
  { name: 'ClockIcon', icon: ClockIcon },
]

export const IconsAndWeights: Story = {
  name: 'Icons & Weights',
  render: () => {
    const weights: { weight: IconWeight; label: string; when: string }[] = [
      {
        weight: 'regular',
        label: 'Regular',
        when: 'Default for all UI — buttons, inputs, menus, nav',
      },
      {
        weight: 'fill',
        label: 'Fill',
        when: 'Toggled-on states — active tab, selected item, bookmarked',
      },
      {
        weight: 'duotone',
        label: 'Duotone',
        when: 'Feature cards, marketing sections, empty states',
      },
    ]

    return (
      <div className="space-y-10 p-8">
        {weights.map((w) => (
          <div key={w.weight}>
            <div className="mb-4 flex items-baseline gap-3">
              <h5>{w.label}</h5>
              <small className="text-muted-foreground">{w.when}</small>
            </div>
            <div className="grid grid-cols-5 gap-3 md:grid-cols-7 lg:grid-cols-9">
              {icons.map((entry) => (
                <IconCell key={entry.name} entry={entry} weight={w.weight} />
              ))}
            </div>
          </div>
        ))}

        <div className="border bg-surface p-4">
          <h6 className="text-muted-foreground">Import convention</h6>
          <pre className="mt-2 text-xs text-foreground">
            {`import { ShieldCheckIcon, PlusIcon } from '@phosphor-icons/react'  // ✅ Icon suffix
import { ShieldCheck, Plus } from '@phosphor-icons/react'          // ❌ deprecated

<ShieldCheckIcon size={20} weight="duotone" className="text-accent" />`}
          </pre>
        </div>
      </div>
    )
  },
}

function PatternRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-3">{children}</div>
      <small className="text-muted-foreground">{label}</small>
    </div>
  )
}

export const DesignPatterns: Story = {
  name: 'Design Patterns',
  render: () => (
    <div className="space-y-10 p-8">
      {/* Sizing */}
      <div>
        <h5>Sizes</h5>
        <div className="mt-4 flex flex-wrap items-end gap-8">
          {[
            { px: 14, use: 'Inside badges' },
            { px: 16, use: 'Inside buttons' },
            { px: 20, use: 'Default — standalone, nav, inputs' },
            { px: 24, use: 'Card headers, section titles' },
            { px: 32, use: 'Empty states, feature highlights' },
          ].map((s) => (
            <div key={s.px} className="flex flex-col items-center gap-2">
              <ShieldCheckIcon size={s.px} />
              <code className="text-xs">{s.px}px</code>
              <small className="max-w-28 text-center text-xs text-muted-foreground">{s.use}</small>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div>
        <h5>Buttons</h5>
        <small className="mb-4 block text-muted-foreground">
          Leading icon for actions, trailing for navigation, size 16
        </small>
        <div className="space-y-4">
          <PatternRow label="Leading — primary action">
            <Button>
              <PlusIcon size={16} className="mr-1.5" /> Add Evidence
            </Button>
          </PatternRow>
          <PatternRow label="Leading — secondary">
            <Button variant="outline">
              <DownloadIcon size={16} className="mr-1.5" /> Export PDF
            </Button>
          </PatternRow>
          <PatternRow label="Trailing — navigation">
            <Button variant="ghost">
              View details <CaretRightIcon size={16} className="ml-1.5" />
            </Button>
          </PatternRow>
          <PatternRow label="Icon-only — toolbar actions">
            <div className="flex gap-1">
              <Button variant="ghost" size="icon-sm">
                <PencilSimpleIcon size={16} />
              </Button>
              <Button variant="ghost" size="icon-sm">
                <CopyIcon size={16} />
              </Button>
              <Button variant="ghost" size="icon-sm">
                <TrashIcon size={16} />
              </Button>
            </div>
          </PatternRow>
          <PatternRow label="Destructive">
            <Button variant="destructive">
              <TrashIcon size={16} className="mr-1.5" /> Delete Case
            </Button>
          </PatternRow>
        </div>
      </div>

      {/* Status badges */}
      <div>
        <h5>Status badges</h5>
        <small className="mb-4 block text-muted-foreground">
          Leading fill icon at size 14 for quick scanning
        </small>
        <div className="flex flex-wrap gap-3">
          <Badge variant="success">
            <CheckCircleIcon data-icon="inline-start" weight="fill" /> Won
          </Badge>
          <Badge variant="destructive">
            <XCircleIcon data-icon="inline-start" weight="fill" /> Lost
          </Badge>
          <Badge variant="warning">
            <WarningIcon data-icon="inline-start" weight="fill" /> Needs Review
          </Badge>
          <Badge variant="info">
            <InfoIcon data-icon="inline-start" weight="fill" /> New
          </Badge>
          <Badge variant="accent">
            <PulseIcon data-icon="inline-start" weight="fill" /> Investigating
          </Badge>
        </div>
      </div>

      {/* Semantic coloring */}
      <div>
        <h5>Semantic colors</h5>
        <small className="mb-4 block text-muted-foreground">
          Icons inherit text color — apply semantic classes directly
        </small>
        <div className="flex flex-wrap gap-6">
          {[
            { icon: CheckCircleIcon, cls: 'text-success-muted-foreground', label: 'success' },
            { icon: WarningIcon, cls: 'text-warning-muted-foreground', label: 'warning' },
            { icon: XCircleIcon, cls: 'text-destructive-muted-foreground', label: 'destructive' },
            { icon: InfoIcon, cls: 'text-info-muted-foreground', label: 'info' },
            { icon: LightningIcon, cls: 'text-accent', label: 'accent' },
            { icon: GearIcon, cls: 'text-muted-foreground', label: 'muted' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <item.icon size={20} className={item.cls} />
              <code className="text-xs">{item.label}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Weight switching */}
      <div>
        <h5>Weight switching</h5>
        <small className="mb-4 block text-muted-foreground">
          Toggle between regular and fill to show active state
        </small>
        <div className="flex gap-6">
          <div className="flex flex-col items-center gap-2 border bg-surface p-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-1">
                <BellIcon size={20} />
                <small className="text-xs text-muted-foreground">inactive</small>
              </div>
              <div className="flex flex-col items-center gap-1">
                <BellIcon size={20} weight="fill" className="text-accent" />
                <small className="text-xs text-muted-foreground">active</small>
              </div>
            </div>
            <code className="text-xs">Notification bell</code>
          </div>
          <div className="flex flex-col items-center gap-2 border bg-surface p-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-1">
                <EyeIcon size={20} />
                <small className="text-xs text-muted-foreground">hidden</small>
              </div>
              <div className="flex flex-col items-center gap-1">
                <EyeIcon size={20} weight="fill" className="text-foreground" />
                <small className="text-xs text-muted-foreground">visible</small>
              </div>
            </div>
            <code className="text-xs">Visibility toggle</code>
          </div>
          <div className="flex flex-col items-center gap-2 border bg-surface p-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center gap-1">
                <HouseIcon size={20} className="text-muted-foreground" />
                <small className="text-xs text-muted-foreground">nav item</small>
              </div>
              <div className="flex flex-col items-center gap-1">
                <HouseIcon size={20} weight="fill" />
                <small className="text-xs text-muted-foreground">current</small>
              </div>
            </div>
            <code className="text-xs">Nav active state</code>
          </div>
        </div>
      </div>
    </div>
  ),
}
