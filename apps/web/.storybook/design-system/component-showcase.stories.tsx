import {
  CalendarIcon,
  CaretDownIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  CurrencyDollarIcon,
  DotsThreeIcon,
  EnvelopeIcon,
  FileTextIcon,
  FolderIcon,
  FunnelIcon,
  GearIcon,
  HouseIcon,
  KeyIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  PaperPlaneTiltIcon,
  PencilIcon,
  PlusIcon,
  PlugIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserIcon,
  WarningIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@web/ui/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@web/ui/components/ui/alert'
import { Badge } from '@web/ui/components/ui/badge'
import { Button } from '@web/ui/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@web/ui/components/ui/card'
import { Checkbox } from '@web/ui/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@web/ui/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@web/ui/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@web/ui/components/ui/dropdown-menu'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@web/ui/components/ui/field'
import { Input } from '@web/ui/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@web/ui/components/ui/input-group'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@web/ui/components/ui/input-otp'
import { Label } from '@web/ui/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@web/ui/components/ui/popover'
import { Progress, ProgressLabel, ProgressValue } from '@web/ui/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@web/ui/components/ui/radio-group'
import { ScrollArea } from '@web/ui/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/ui/components/ui/select'
import { Separator } from '@web/ui/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@web/ui/components/ui/sheet'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarInset,
  SidebarRail,
  SidebarTrigger,
} from '@web/ui/components/ui/sidebar'
import { Skeleton } from '@web/ui/components/ui/skeleton'
import { Slider } from '@web/ui/components/ui/slider'
import { Switch } from '@web/ui/components/ui/switch'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@web/ui/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@web/ui/components/ui/tabs'
import { Textarea } from '@web/ui/components/ui/textarea'
import { Toggle } from '@web/ui/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@web/ui/components/ui/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@web/ui/components/ui/tooltip'
import { useState } from 'react'
import { toast } from 'sonner'
import { Toaster as Sonner } from 'sonner'

const meta: Meta = {
  title: 'Design System/Component Showcase',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

function LegacyPrimarySwitch({ size = 'default' }: { size?: 'sm' | 'default' }): React.JSX.Element {
  const [checked, setChecked] = useState(true)

  return (
    <button
      aria-checked={checked}
      className="relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-all outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
      data-size={size}
      data-slot="legacy-primary-switch"
      data-state={checked ? 'checked' : 'unchecked'}
      onClick={() => setChecked((value) => !value)}
      role="switch"
      type="button"
    >
      <span
        className="block rounded-full bg-background transition-transform data-[size=default]:size-4 data-[size=sm]:size-3 data-[size=default]:data-[state=checked]:translate-x-[calc(100%-2px)] data-[size=sm]:data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        data-size={size}
        data-state={checked ? 'checked' : 'unchecked'}
      />
    </button>
  )
}

export const InteractiveElements: Story = {
  name: 'Interactive Elements',
  render: () => (
    <div className="space-y-10 p-8">
      {/* Buttons */}
      <section>
        <h3 className="mb-4">Buttons</h3>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Submit Evidence</Button>
            <Button variant="accent">Highlight Action</Button>
            <Button variant="secondary">View Case</Button>
            <Button variant="ghost">Dismiss</Button>
            <Button variant="destructive">Reject</Button>
            <Button variant="link">Learn more</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="xs">xs</Button>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">
              <PlusIcon />
            </Button>
            <Button size="icon-sm" variant="ghost">
              <DotsThreeIcon />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled
            </Button>
            <Button>
              <PaperPlaneTiltIcon data-icon="inline-start" />
              Submit Packet
            </Button>
            <Button variant="outline">
              <FunnelIcon data-icon="inline-start" />
              Filter
              <CaretDownIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </section>

      <Separator />

      {/* Badges */}
      <section>
        <h3 className="mb-4">Badges</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge variant="success">Won</Badge>
          <Badge variant="destructive">Lost</Badge>
          <Badge variant="accent">Investigating</Badge>
          <Badge variant="info">Submitted</Badge>
          <Badge variant="warning">Needs Review</Badge>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Badge variant="success">
            <CheckCircleIcon data-icon="inline-start" /> Won
          </Badge>
          <Badge variant="destructive">
            <XCircleIcon data-icon="inline-start" /> Lost
          </Badge>
          <Badge variant="accent">
            <LightningIcon data-icon="inline-start" /> Investigating
          </Badge>
          <Badge variant="info">
            <EnvelopeIcon data-icon="inline-start" /> Submitted
          </Badge>
          <Badge variant="warning">
            <WarningIcon data-icon="inline-start" /> Needs Review
          </Badge>
        </div>
      </section>

      <Separator />

      {/* Toggle & Switch */}
      <section>
        <h3 className="mb-4">Toggles & Switches</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Toggle aria-label="Toggle bold" defaultPressed>
              <LightningIcon />
            </Toggle>
            <Toggle variant="outline" aria-label="Toggle filter">
              <FunnelIcon />
              Active only
            </Toggle>
            <ToggleGroup type="single" defaultValue="all" variant="outline">
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="won">Won</ToggleGroupItem>
              <ToggleGroupItem value="lost">Lost</ToggleGroupItem>
              <ToggleGroupItem value="pending">Pending</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch defaultChecked />
              <Label>Auto-submit evidence</Label>
            </div>
            <div className="flex items-center gap-2">
              <LegacyPrimarySwitch />
              <Label>Original primary</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch />
              <Label>Email notifications</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch size="sm" defaultChecked />
              <Label>Compact</Label>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Checkbox & Radio */}
      <section>
        <h3 className="mb-4">Checkboxes & Radio</h3>
        <div className="flex gap-12">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox defaultChecked />
              <Label>Stripe Events</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox defaultChecked />
              <Label>Application Logs</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox />
              <Label>Auth Sessions</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox disabled />
              <Label>Webhooks (unavailable)</Label>
            </div>
          </div>
          <RadioGroup defaultValue="auto">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="auto" />
              <Label>Auto-submit</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="review" />
              <Label>Review first</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="manual" />
              <Label>Manual only</Label>
            </div>
          </RadioGroup>
        </div>
      </section>

      <Separator />

      {/* Progress */}
      <section>
        <h3 className="mb-4">Progress</h3>
        <div className="max-w-md space-y-4">
          <Progress value={92}>
            <ProgressLabel>Evidence Score</ProgressLabel>
            <ProgressValue />
          </Progress>
          <Progress value={60}>
            <ProgressLabel>Sources Processed</ProgressLabel>
            <ProgressValue />
          </Progress>
          <Progress value={25}>
            <ProgressLabel>Time Remaining</ProgressLabel>
            <ProgressValue />
          </Progress>
        </div>
      </section>

      <Separator />

      {/* Accordion */}
      <section>
        <h3 className="mb-4">Accordion</h3>
        <div className="max-w-lg">
          <Accordion>
            <AccordionItem value="what">
              <AccordionTrigger>What evidence does Riposte collect?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Riposte automatically gathers transaction records, shipping confirmations,
                  customer authentication logs, and communication history to build a comprehensive
                  evidence packet.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="how">
              <AccordionTrigger>How does auto-submission work?</AccordionTrigger>
              <AccordionContent>
                <p>
                  When the confidence score exceeds your configured threshold, Riposte submits the
                  evidence packet to Stripe automatically. You can review submissions before they go
                  out by setting a higher threshold or disabling auto-submit.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="deadline">
              <AccordionTrigger>What happens if a deadline is missed?</AccordionTrigger>
              <AccordionContent>
                <p>
                  Stripe enforces a hard deadline (typically 7-21 days). If evidence is not
                  submitted before the deadline, the dispute is automatically lost and the funds are
                  returned to the cardholder.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <Separator />

      {/* Slider */}
      <section>
        <h3 className="mb-4">Slider</h3>
        <div className="max-w-md space-y-6">
          <Field>
            <FieldLabel>Confidence threshold</FieldLabel>
            <Slider defaultValue={[80]} />
            <FieldDescription>Auto-submit when score is above this value</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Amount range</FieldLabel>
            <Slider defaultValue={[50, 500]} max={1000} />
            <FieldDescription>Filter disputes by amount ($50 – $500)</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>Disabled</FieldLabel>
            <Slider defaultValue={[40]} disabled />
          </Field>
        </div>
      </section>

      <Separator />

      {/* Tooltips */}
      <section>
        <h3 className="mb-4">Tooltips</h3>
        <TooltipProvider>
          <div className="flex flex-wrap items-center gap-4">
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" size="icon" />}>
                <ShieldCheckIcon />
              </TooltipTrigger>
              <TooltipContent>Evidence verified</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" size="icon" />}>
                <ClockIcon />
              </TooltipTrigger>
              <TooltipContent side="bottom">Due in 3 days</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" size="icon" />}>
                <WarningIcon />
              </TooltipTrigger>
              <TooltipContent side="right">Low confidence score</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Badge variant="info" />}>Submitted</TooltipTrigger>
              <TooltipContent>Submitted to Stripe on May 2, 2026</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </section>
    </div>
  ),
}

export const CardsAndSurfaces: Story = {
  name: 'Cards & Surfaces',
  render: () => (
    <div className="space-y-10 p-8">
      {/* Case cards */}
      <section>
        <h3 className="mb-4">Case Cards</h3>
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-system">dp_3Qx9Kl2m</CardTitle>
              <CardDescription>
                Fraudulent charge · <span className="text-system">$249.00</span>
              </CardDescription>
              <CardAction>
                <Badge variant="success">Won</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Evidence packet submitted with 92/100 confidence score. 4 corroborating sources
                found.
              </p>
            </CardContent>
            <CardFooter>
              <small className="text-system text-muted-foreground">Resolved May 10, 2026</small>
              <Button variant="ghost" size="xs" className="ml-auto">
                View details
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-system">dp_7Yw2Mn8p</CardTitle>
              <CardDescription>
                Product not received · <span className="text-system">$89.00</span>
              </CardDescription>
              <CardAction>
                <Badge variant="accent">Investigating</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <Progress value={45}>
                <ProgressLabel>Building evidence</ProgressLabel>
                <ProgressValue />
              </Progress>
            </CardContent>
            <CardFooter>
              <small className="text-system text-muted-foreground">Due in 12 days</small>
              <Button variant="ghost" size="xs" className="ml-auto">
                View details
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Metric cards */}
      <section>
        <h3 className="mb-4">Metric Cards</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Win Rate', value: '73%', change: '+4%', positive: true },
            { label: 'Active Cases', value: '12', change: '3 due soon', positive: false },
            { label: 'Recovered', value: '$4,280', change: 'this month', positive: true },
            { label: 'Avg Response', value: '2.3h', change: '-18min', positive: true },
          ].map((metric) => (
            <Card key={metric.label} size="sm">
              <CardContent>
                <small className="text-muted-foreground">{metric.label}</small>
                <p className="mt-1 text-lg font-semibold">{metric.value}</p>
                <small
                  className={
                    metric.positive
                      ? 'text-success-muted-foreground'
                      : 'text-warning-muted-foreground'
                  }
                >
                  {metric.change}
                </small>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Alerts */}
      <section>
        <h3 className="mb-4">Alerts</h3>
        <div className="max-w-lg space-y-3">
          <Alert>
            <CheckCircleIcon />
            <AlertTitle>Evidence submitted</AlertTitle>
            <AlertDescription>
              Packet for dp_3Qx9Kl2m was submitted to Stripe successfully.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <XCircleIcon />
            <AlertTitle>Submission failed</AlertTitle>
            <AlertDescription>
              Could not reach Stripe API. Will retry in 5 minutes.
            </AlertDescription>
          </Alert>
        </div>
      </section>
    </div>
  ),
}

export const FormsAndInputs: Story = {
  name: 'Forms & Inputs',
  render: () => (
    <div className="space-y-10 p-8">
      {/* Integration setup form */}
      <section>
        <h3 className="mb-4">Integration Setup</h3>
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Connect Stripe</CardTitle>
            <CardDescription>
              Enter your Stripe API keys to enable dispute monitoring.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Secret Key</FieldLabel>
                <Input type="password" placeholder="sk_live_..." />
                <FieldDescription>
                  Found in your Stripe Dashboard → Developers → API Keys
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Webhook Signing Secret</FieldLabel>
                <Input type="password" placeholder="whsec_..." />
              </Field>
              <Field>
                <FieldLabel>Mode</FieldLabel>
                <Select defaultValue="live">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Connect</Button>
          </CardFooter>
        </Card>
      </section>

      <Separator />

      {/* Case settings form */}
      <section>
        <h3 className="mb-4">Case Settings</h3>
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Auto-Response Rules</CardTitle>
            <CardDescription>
              Configure when Riposte should automatically submit evidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Minimum Confidence Score</FieldLabel>
                <Input type="number" defaultValue="80" />
                <FieldDescription>
                  Only auto-submit when score is above this threshold.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel>Dispute Types</FieldLabel>
                <Select defaultValue="all">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="fraudulent">Fraudulent</SelectItem>
                    <SelectItem value="not_received">Product not received</SelectItem>
                    <SelectItem value="duplicate">Duplicate</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Notes for reviewer</FieldLabel>
                <Textarea placeholder="Any additional context for manual review cases..." />
              </Field>
              <Field>
                <FieldLabel htmlFor="field-err">Webhook URL (invalid example)</FieldLabel>
                <Input id="field-err" aria-invalid defaultValue="not-a-url" />
                <FieldError>Must be a valid HTTPS URL</FieldError>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline">Reset</Button>
            <Button>Save Rules</Button>
          </CardFooter>
        </Card>
      </section>

      <Separator />

      {/* Input Groups */}
      <section>
        <h3 className="mb-4">Input Groups</h3>
        <div className="max-w-lg space-y-4">
          <Field>
            <FieldLabel>Search</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <MagnifyingGlassIcon />
              </InputGroupAddon>
              <InputGroupInput placeholder="Search cases..." />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel>Amount</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <CurrencyDollarIcon />
              </InputGroupAddon>
              <InputGroupInput type="number" placeholder="0.00" />
              <InputGroupAddon align="inline-end">
                <InputGroupText>USD</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel>API Key</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <KeyIcon />
              </InputGroupAddon>
              <InputGroupInput type="password" placeholder="sk_live_..." />
              <InputGroupAddon align="inline-end">
                <InputGroupButton>
                  <CopyIcon />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel>Disabled</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <UserIcon />
              </InputGroupAddon>
              <InputGroupInput disabled placeholder="Disabled input" />
            </InputGroup>
          </Field>
        </div>
      </section>

      <Separator />

      {/* OTP Input */}
      <section>
        <h3 className="mb-4">OTP Input</h3>
        <div className="space-y-6">
          <Field>
            <FieldLabel>Verification code</FieldLabel>
            <InputOTP maxLength={6}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <FieldDescription>Enter the 6-digit code sent to your email</FieldDescription>
          </Field>
        </div>
      </section>

      <Separator />

      {/* Search & Filter bar */}
      <section>
        <h3 className="mb-4">Search & Filters</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search cases by ID, customer, or amount..." />
          </div>
          <Select defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="7d">
            <SelectTrigger>
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <FunnelIcon />
          </Button>
        </div>
      </section>
    </div>
  ),
}

export const OverlaysAndMenus: Story = {
  name: 'Overlays & Menus',
  render: () => (
    <div className="space-y-10 p-8">
      {/* Dropdown */}
      <section>
        <h3 className="mb-4">Dropdown Menus</h3>
        <div className="flex gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              <DotsThreeIcon />
              Actions
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuLabel>Case Actions</DropdownMenuLabel>
                <DropdownMenuItem>
                  <PencilIcon />
                  Edit notes
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <CopyIcon />
                  Copy case ID
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <PaperPlaneTiltIcon />
                  Resubmit evidence
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <TrashIcon />
                  Delete case
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              <GearIcon />
              Settings
              <CaretDownIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <EnvelopeIcon />
                  Notification preferences
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ShieldCheckIcon />
                  API keys
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <LightningIcon />
                  Integrations
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <Separator />

      {/* Dialog */}
      <section>
        <h3 className="mb-4">Dialogs</h3>
        <div className="flex gap-4">
          <Dialog>
            <DialogTrigger render={<Button variant="destructive" />}>Reject case</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject dp_3Qx9Kl2m?</DialogTitle>
                <DialogDescription>
                  This will mark the case as rejected and no evidence will be submitted. The dispute
                  deadline will still apply.
                </DialogDescription>
              </DialogHeader>
              <Textarea placeholder="Reason for rejection (optional)..." />
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button variant="destructive">Reject</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger render={<Button />}>Submit Evidence</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit evidence packet?</DialogTitle>
                <DialogDescription>
                  This will submit the generated evidence to Stripe for dispute dp_7Yw2Mn8p. This
                  action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 border bg-surface p-3">
                <div className="flex justify-between">
                  <small className="text-muted-foreground">Confidence</small>
                  <small className="font-medium">92/100</small>
                </div>
                <div className="flex justify-between">
                  <small className="text-muted-foreground">Sources</small>
                  <small className="font-medium">4 corroborating</small>
                </div>
                <div className="flex justify-between">
                  <small className="text-muted-foreground">Deadline</small>
                  <small className="font-medium">May 15, 2026</small>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Review first</Button>
                <Button>Submit now</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <Separator />

      {/* Sheet */}
      <section>
        <h3 className="mb-4">Sheet</h3>
        <div className="flex gap-4">
          <Sheet>
            <SheetTrigger render={<Button variant="outline" />}>
              <FileTextIcon data-icon="inline-start" />
              Case Details
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>dp_3Qx9Kl2m</SheetTitle>
                <SheetDescription>Fraudulent charge · $249.00</SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <div className="space-y-2">
                  {[
                    { label: 'Status', value: 'Won' },
                    { label: 'Confidence', value: '92/100' },
                    { label: 'Sources', value: '4 corroborating' },
                    { label: 'Submitted', value: 'May 2, 2026' },
                    { label: 'Resolved', value: 'May 10, 2026' },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between border-b pb-2">
                      <small className="text-muted-foreground">{row.label}</small>
                      <small className="font-medium">{row.value}</small>
                    </div>
                  ))}
                </div>
              </div>
              <SheetFooter>
                <Button variant="outline">Export PDF</Button>
                <Button>View Full Case</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Sheet>
            <SheetTrigger render={<Button variant="outline" />}>
              <FunnelIcon data-icon="inline-start" />
              Filters
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Filter Cases</SheetTitle>
                <SheetDescription>Narrow down your dispute list</SheetDescription>
              </SheetHeader>
              <div className="flex-1 space-y-4 p-4">
                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Min amount</FieldLabel>
                  <Input type="number" placeholder="$0.00" />
                </Field>
              </div>
              <SheetFooter>
                <Button>Apply Filters</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </section>

      <Separator />

      {/* Popover */}
      <section>
        <h3 className="mb-4">Popovers</h3>
        <div className="flex gap-4">
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              <ClockIcon data-icon="inline-start" />
              Due May 15
            </PopoverTrigger>
            <PopoverContent>
              <PopoverHeader>
                <PopoverTitle>Dispute Deadline</PopoverTitle>
                <PopoverDescription>
                  Stripe requires evidence submission by this date. Late submissions are
                  automatically rejected.
                </PopoverDescription>
              </PopoverHeader>
              <div className="space-y-1 border-t pt-2">
                <div className="flex justify-between">
                  <small className="text-muted-foreground">Opened</small>
                  <small>May 1, 2026</small>
                </div>
                <div className="flex justify-between">
                  <small className="text-muted-foreground">Deadline</small>
                  <small className="font-medium text-warning-muted-foreground">May 15, 2026</small>
                </div>
                <div className="flex justify-between">
                  <small className="text-muted-foreground">Days remaining</small>
                  <small className="font-medium">13</small>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" />}>
              <CalendarIcon data-icon="inline-start" />4 sources
            </PopoverTrigger>
            <PopoverContent>
              <PopoverHeader>
                <PopoverTitle>Evidence Sources</PopoverTitle>
                <PopoverDescription>
                  Data sources used to build this evidence packet.
                </PopoverDescription>
              </PopoverHeader>
              <div className="space-y-2 border-t pt-2">
                {[
                  { name: 'Stripe Events', count: 12 },
                  { name: 'Application Logs', count: 4 },
                  { name: 'Auth Sessions', count: 3 },
                  { name: 'API Requests', count: 8 },
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <small>{s.name}</small>
                    <Badge variant="secondary">{s.count}</Badge>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </section>
    </div>
  ),
}

export const TabsAndNavigation: Story = {
  name: 'Tabs & Navigation',
  render: () => (
    <div className="space-y-10 p-8">
      {/* Default tabs */}
      <section>
        <h3 className="mb-4">Default Tabs</h3>
        <div className="max-w-xl">
          <Tabs defaultValue="summary">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="evidence">Evidence</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="logs" disabled>
                Logs
              </TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-4">
              <Card>
                <CardContent>
                  <p className="text-muted-foreground">
                    Customer <code>cus_P4r5mN7q</code> completed signup on April 28, logged in 3
                    times, and accessed the product dashboard before filing the dispute.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="evidence" className="mt-4">
              <Card>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { label: 'Confidence', value: '92/100' },
                      { label: 'Sources', value: '4 corroborating' },
                      { label: 'Deadline', value: 'May 15, 2026' },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between border-b pb-2">
                        <small className="text-muted-foreground">{row.label}</small>
                        <small className="font-medium">{row.value}</small>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="timeline" className="mt-4">
              <Card>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { time: 'May 1, 10:23am', event: 'Dispute opened by cardholder' },
                      { time: 'May 1, 10:24am', event: 'Evidence collection started' },
                      { time: 'May 2, 2:15pm', event: 'Evidence packet submitted' },
                    ].map((entry) => (
                      <div key={entry.time} className="flex gap-3">
                        <small className="w-32 shrink-0 text-muted-foreground">{entry.time}</small>
                        <small>{entry.event}</small>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Separator />

      {/* Default tabs with icons */}
      <section>
        <h3 className="mb-4">Default Tabs with Icons</h3>
        <div className="max-w-xl">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">
                <ChartBarIcon /> Overview
              </TabsTrigger>
              <TabsTrigger value="integrations">
                <PlugIcon /> Integrations
              </TabsTrigger>
              <TabsTrigger value="settings">
                <GearIcon /> Settings
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4">
              <p className="text-muted-foreground">
                Dashboard overview with key metrics and charts.
              </p>
            </TabsContent>
            <TabsContent value="integrations" className="mt-4">
              <p className="text-muted-foreground">Manage connected services and webhooks.</p>
            </TabsContent>
            <TabsContent value="settings" className="mt-4">
              <p className="text-muted-foreground">Account and organization settings.</p>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Separator />

      {/* Line tabs variant */}
      <section>
        <h3 className="mb-4">Line Tabs</h3>
        <div className="max-w-xl">
          <Tabs defaultValue="general">
            <TabsList variant="line">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="billing" disabled>
                Billing
              </TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="mt-4">
              <FieldGroup>
                <Field>
                  <FieldLabel>Organization Name</FieldLabel>
                  <Input defaultValue="Acme Corp" />
                </Field>
                <Field orientation="horizontal">
                  <Switch defaultChecked />
                  <FieldLabel>Auto-submit when confidence {'>'} 80%</FieldLabel>
                </Field>
              </FieldGroup>
            </TabsContent>
            <TabsContent value="integrations" className="mt-4">
              <div className="space-y-3">
                {[
                  { name: 'Stripe', status: 'Connected', badge: 'success' as const },
                  { name: 'Slack', status: 'Not configured', badge: 'secondary' as const },
                ].map((i) => (
                  <div key={i.name} className="flex items-center justify-between border-b pb-3">
                    <p className="text-sm font-medium">{i.name}</p>
                    <Badge variant={i.badge}>{i.status}</Badge>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="notifications" className="mt-4">
              <div className="space-y-3">
                {[
                  { label: 'New dispute received', on: true },
                  { label: 'Evidence submitted', on: true },
                  { label: 'Case resolved', on: false },
                ].map((n) => (
                  <div key={n.label} className="flex items-center justify-between">
                    <p className="text-sm">{n.label}</p>
                    <Switch defaultChecked={n.on} />
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <Separator />

      {/* Line tabs with icons */}
      <section>
        <h3 className="mb-4">Line Tabs with Icons</h3>
        <div className="max-w-xl">
          <Tabs defaultValue="cases">
            <TabsList variant="line">
              <TabsTrigger value="cases">
                <FolderIcon /> Cases
              </TabsTrigger>
              <TabsTrigger value="evidence">
                <FileTextIcon /> Evidence
              </TabsTrigger>
              <TabsTrigger value="security">
                <ShieldCheckIcon /> Security
              </TabsTrigger>
            </TabsList>
            <TabsContent value="cases" className="mt-4">
              <p className="text-muted-foreground">
                Active dispute cases and their current status.
              </p>
            </TabsContent>
            <TabsContent value="evidence" className="mt-4">
              <p className="text-muted-foreground">
                Collected evidence packets ready for submission.
              </p>
            </TabsContent>
            <TabsContent value="security" className="mt-4">
              <p className="text-muted-foreground">Security audit logs and access controls.</p>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  ),
}

export const ComposedPatterns: Story = {
  name: 'Composed Patterns',
  render: () => (
    <div className="space-y-10 p-8">
      {/* Case list item */}
      <section>
        <h3 className="mb-4">Case List</h3>
        <div className="divide-y border">
          {[
            { id: 'dp_3Qx9Kl2m', amount: '$249.00', type: 'Fraudulent', status: 'Won', score: 92 },
            {
              id: 'dp_7Yw2Mn8p',
              amount: '$89.00',
              type: 'Not received',
              status: 'Investigating',
              score: 45,
            },
            {
              id: 'dp_9Zk4Pq1n',
              amount: '$512.00',
              type: 'Duplicate',
              status: 'Submitted',
              score: 87,
            },
            { id: 'dp_2Ht6Wj5r', amount: '$34.99', type: 'Fraudulent', status: 'Lost', score: 31 },
          ].map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 bg-background px-4 py-3 hover:bg-background-hover"
            >
              <Checkbox />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <code className="text-xs">{c.id}</code>
                  <Badge variant="outline">{c.type}</Badge>
                </div>
                <small className="text-muted-foreground">{c.amount}</small>
              </div>
              <div className="flex items-center gap-3">
                <small className="text-muted-foreground tabular-nums">{c.score}/100</small>
                <Badge
                  variant={
                    c.status === 'Won'
                      ? 'success'
                      : c.status === 'Lost'
                        ? 'destructive'
                        : c.status === 'Investigating'
                          ? 'accent'
                          : 'info'
                  }
                >
                  {c.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" />}>
                    <DotsThreeIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem>View details</DropdownMenuItem>
                      <DropdownMenuItem>Copy ID</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* Notification settings */}
      <section>
        <h3 className="mb-4">Notification Preferences</h3>
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Choose which events trigger email alerts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  label: 'New dispute received',
                  desc: 'When Stripe sends a new dispute webhook',
                  on: true,
                },
                {
                  label: 'Evidence submitted',
                  desc: 'When an evidence packet is sent to Stripe',
                  on: true,
                },
                { label: 'Case resolved', desc: 'When a dispute outcome is decided', on: true },
                {
                  label: 'Low confidence warning',
                  desc: 'When score is below auto-submit threshold',
                  on: false,
                },
              ].map((n) => (
                <div key={n.label} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium">{n.label}</p>
                    <small className="text-muted-foreground">{n.desc}</small>
                  </div>
                  <Switch defaultChecked={n.on} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* Warning state */}
      <section>
        <h3 className="mb-4">Warning States</h3>
        <div className="max-w-lg space-y-3">
          <Alert>
            <WarningIcon />
            <AlertTitle>3 cases due within 48 hours</AlertTitle>
            <AlertDescription>
              dp_7Yw2Mn8p, dp_9Zk4Pq1n, dp_1Bc3Df9x need evidence submitted before their deadlines.
            </AlertDescription>
          </Alert>
          <Card className="border-border-destructive-non-interactive">
            <CardHeader>
              <CardTitle className="text-destructive-muted-foreground">Connection Lost</CardTitle>
              <CardDescription>
                Stripe webhook endpoint is unreachable. New disputes will not be detected until
                connectivity is restored.
              </CardDescription>
            </CardHeader>
            <CardFooter className="gap-2">
              <Button size="sm">Retry connection</Button>
              <Button variant="outline" size="sm">
                View logs
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  ),
}

function SidebarDemo() {
  const [active, setActive] = useState('dashboard')
  const [casesOpen, setCasesOpen] = useState(true)

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: HouseIcon },
    {
      id: 'cases',
      label: 'Cases',
      icon: FolderIcon,
      children: [
        { id: 'cases-active', label: 'Active' },
        { id: 'cases-won', label: 'Won' },
        { id: 'cases-lost', label: 'Lost' },
      ],
    },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
    { id: 'integrations', label: 'Integrations', icon: PlugIcon },
  ]

  const pageTitle =
    navItems.find((n) => n.id === active)?.label ??
    navItems.flatMap((n) => n.children ?? []).find((c) => c.id === active)?.label ??
    'Dashboard'

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarRail />
        <SidebarHeader className="p-3">
          <div className="flex items-center gap-2 px-1">
            <div className="size-6 bg-accent" />
            <span className="text-sm font-semibold">Riposte</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={active === item.id || item.children?.some((c) => c.id === active)}
                      onClick={() => {
                        if (item.children) {
                          setCasesOpen(!casesOpen)
                        } else {
                          setActive(item.id)
                        }
                      }}
                    >
                      <item.icon />
                      {item.label}
                      {item.children && (
                        <CaretDownIcon
                          className={`ml-auto !size-3 transition-transform ${casesOpen ? '' : '-rotate-90'}`}
                        />
                      )}
                    </SidebarMenuButton>
                    {item.children && casesOpen && (
                      <SidebarMenuSub>
                        {item.children.map((child) => (
                          <SidebarMenuSubItem key={child.id}>
                            <SidebarMenuSubButton
                              isActive={active === child.id}
                              onClick={() => setActive(child.id)}
                            >
                              {child.label}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Recent Cases</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { id: 'dp_3Qx9Kl2m', status: 'Won' },
                  { id: 'dp_7Yw2Mn8p', status: 'Investigating' },
                  { id: 'dp_9Zk4Pq1n', status: 'Submitted' },
                ].map((c) => (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton isActive={active === c.id} onClick={() => setActive(c.id)}>
                      <code className="text-system">{c.id}</code>
                      <SidebarMenuBadge>{c.status}</SidebarMenuBadge>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Disabled Example</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton disabled>
                    <ShieldCheckIcon />
                    Compliance (coming soon)
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={active === 'settings'}
                onClick={() => setActive('settings')}
              >
                <GearIcon />
                Settings
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center gap-2 border-b px-4 py-2">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
          <h5>{pageTitle}</h5>
        </header>
        <main className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Win Rate', value: '73%' },
              { label: 'Active Cases', value: '12' },
              { label: 'Recovered', value: '$4,280' },
            ].map((m) => (
              <Card key={m.label} size="sm">
                <CardContent>
                  <small className="text-muted-foreground">{m.label}</small>
                  <p className="mt-1 text-lg font-semibold">{m.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export const SidebarLayout: Story = {
  name: 'Sidebar Layout',
  parameters: { layout: 'fullscreen' },
  render: () => <SidebarDemo />,
}

export const Toasts: Story = {
  name: 'Toasts (Sonner)',
  render: () => (
    <div className="space-y-6 p-8">
      <Sonner position="bottom-right" theme="light" />
      <h3>Toast Variants</h3>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => toast('Default toast', { description: 'This is a default notification.' })}
        >
          Default
        </Button>
        <Button
          onClick={() =>
            toast.success('Evidence submitted', { description: 'Case dp_3Qx9Kl2m updated.' })
          }
        >
          Success
        </Button>
        <Button
          onClick={() =>
            toast.error('Submission failed', { description: 'Stripe API returned 500.' })
          }
        >
          Error
        </Button>
        <Button
          onClick={() =>
            toast.warning('Deadline approaching', {
              description: 'Case dp_7Yw2Mn8p due in 2 days.',
            })
          }
        >
          Warning
        </Button>
        <Button
          onClick={() =>
            toast.info('New dispute received', {
              description: 'dp_4Rt8Xn3q — $189.00 fraudulent charge.',
            })
          }
        >
          Info
        </Button>
        <Button onClick={() => toast.loading('Processing evidence...')}>Loading</Button>
      </div>
      <Separator />
      <h3>With Actions</h3>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() =>
            toast('Case archived', {
              description: 'dp_3Qx9Kl2m moved to archive.',
              action: { label: 'Undo', onClick: () => toast.success('Restored') },
            })
          }
        >
          With Undo
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.success('Evidence packet ready', {
              description: '4 sources, 92/100 confidence.',
              action: { label: 'View', onClick: () => {} },
            })
          }
        >
          With Action
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.promise(new Promise((resolve) => setTimeout(resolve, 2000)), {
              loading: 'Submitting to Stripe...',
              success: 'Evidence submitted',
              error: 'Submission failed',
            })
          }
        >
          Promise
        </Button>
      </div>
    </div>
  ),
}

const disputes = [
  {
    id: 'dp_3Qx9Kl2m',
    customer: 'cus_P4r5mN7q',
    type: 'Fraudulent',
    amount: '$249.00',
    score: 92,
    status: 'Won' as const,
    due: 'May 10',
  },
  {
    id: 'dp_7Rm4Np8v',
    customer: 'cus_K8t2Bx9w',
    type: 'Not received',
    amount: '$89.00',
    score: 45,
    status: 'Investigating' as const,
    due: 'May 15',
  },
  {
    id: 'dp_9Zk4Pq1n',
    customer: 'cus_L3m7Hy4c',
    type: 'Duplicate',
    amount: '$512.00',
    score: 87,
    status: 'Submitted' as const,
    due: 'May 18',
  },
  {
    id: 'dp_2Ht6Wj5r',
    customer: 'cus_Q9n1Vf6d',
    type: 'Fraudulent',
    amount: '$34.99',
    score: 31,
    status: 'Lost' as const,
    due: 'Apr 28',
  },
  {
    id: 'dp_5Xc8Gn2k',
    customer: 'cus_R2p4Jt8s',
    type: 'Subscription',
    amount: '$150.00',
    score: 78,
    status: 'Investigating' as const,
    due: 'May 20',
  },
]

const statusVariant = (status: string) =>
  status === 'Won'
    ? ('success' as const)
    : status === 'Lost'
      ? ('destructive' as const)
      : status === 'Investigating'
        ? ('accent' as const)
        : ('info' as const)

export const DataDisplay: Story = {
  name: 'Data Display',
  render: () => (
    <div className="space-y-10 p-8">
      {/* Table */}
      <section>
        <h3 className="mb-4">Table</h3>
        <Table>
          <TableCaption>Recent disputes for Acme Corp</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Case</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {disputes.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <code>{d.id}</code>
                </TableCell>
                <TableCell className="text-muted-foreground">{d.customer}</TableCell>
                <TableCell>{d.type}</TableCell>
                <TableCell className="text-right font-medium">{d.amount}</TableCell>
                <TableCell className="text-center tabular-nums">{d.score}/100</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{d.due}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon-xs">
                    <DotsThreeIcon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right font-medium">$1,034.99</TableCell>
              <TableCell colSpan={4} />
            </TableRow>
          </TableFooter>
        </Table>
      </section>

      <Separator />

      {/* Scroll Area */}
      <section>
        <h3 className="mb-4">Scroll Area</h3>
        <ScrollArea className="h-48 w-full max-w-md border p-4">
          <div className="space-y-3">
            {Array.from({ length: 15 }, (_, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-2">
                <div>
                  <small className="font-medium">Event #{i + 1}</small>
                  <small className="ml-2 text-muted-foreground">
                    dispute.{i % 2 === 0 ? 'created' : 'updated'}
                  </small>
                </div>
                <small className="text-muted-foreground">{i + 1}m ago</small>
              </div>
            ))}
          </div>
        </ScrollArea>
      </section>

      <Separator />

      {/* Skeleton loading states */}
      <section>
        <h3 className="mb-4">Skeleton</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <small className="mb-3 block text-muted-foreground">Card skeleton</small>
            <Card>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
              <CardFooter className="justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
              </CardFooter>
            </Card>
          </div>
          <div>
            <small className="mb-3 block text-muted-foreground">Table skeleton</small>
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  ),
}

export const CommandPalette: Story = {
  name: 'Command Palette',
  render: () => (
    <div className="space-y-10 p-8">
      <section>
        <h3 className="mb-4">Command Menu</h3>
        <div className="mx-auto max-w-lg border shadow-md">
          <Command>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Cases">
                <CommandItem>
                  <MagnifyingGlassIcon />
                  Search cases
                  <CommandShortcut>⌘K</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <PlusIcon />
                  New case
                  <CommandShortcut>⌘N</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <FunnelIcon />
                  Filter cases
                  <CommandShortcut>⌘F</CommandShortcut>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Actions">
                <CommandItem>
                  <PaperPlaneTiltIcon />
                  Submit evidence
                  <CommandShortcut>⌘⏎</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <CopyIcon />
                  Copy case ID
                  <CommandShortcut>⌘C</CommandShortcut>
                </CommandItem>
                <CommandItem>
                  <FileTextIcon />
                  Export PDF
                  <CommandShortcut>⌘E</CommandShortcut>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Settings">
                <CommandItem>
                  <GearIcon />
                  Preferences
                </CommandItem>
                <CommandItem>
                  <PlugIcon />
                  Integrations
                </CommandItem>
                <CommandItem>
                  <ShieldCheckIcon />
                  API keys
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </section>
    </div>
  ),
}
