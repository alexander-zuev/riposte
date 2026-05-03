import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  CalendarIcon,
  CaretDownIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  CopyIcon,
  DotsThreeIcon,
  EnvelopeIcon,
  FolderIcon,
  FunnelIcon,
  GearIcon,
  HouseIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  PaperPlaneTiltIcon,
  PencilIcon,
  PlusIcon,
  PlugIcon,
  ShieldCheckIcon,
  TrashIcon,
  WarningIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@web/ui/components/ui/select'
import { Separator } from '@web/ui/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@web/ui/components/ui/sidebar'
import { Switch } from '@web/ui/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@web/ui/components/ui/tabs'
import { Textarea } from '@web/ui/components/ui/textarea'
import { Toggle } from '@web/ui/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@web/ui/components/ui/toggle-group'

const meta: Meta = {
  title: 'Design System/Component Showcase',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

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
            <Button size="icon"><PlusIcon /></Button>
            <Button size="icon-sm" variant="ghost"><DotsThreeIcon /></Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>Disabled</Button>
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
              <CardDescription>Fraudulent charge · <span className="text-system">$249.00</span></CardDescription>
              <CardAction>
                <Badge variant="success">Won</Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Evidence packet submitted with 92/100 confidence score. 4 corroborating sources found.
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
              <CardDescription>Product not received · <span className="text-system">$89.00</span></CardDescription>
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
                <small className={metric.positive ? 'text-success-muted-foreground' : 'text-warning-muted-foreground'}>
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
            <CardDescription>Enter your Stripe API keys to enable dispute monitoring.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Secret Key</FieldLabel>
                <Input type="password" placeholder="sk_live_..." />
                <FieldDescription>Found in your Stripe Dashboard → Developers → API Keys</FieldDescription>
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
            <CardDescription>Configure when Riposte should automatically submit evidence.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel>Minimum Confidence Score</FieldLabel>
                <Input type="number" defaultValue="80" />
                <FieldDescription>Only auto-submit when score is above this threshold.</FieldDescription>
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
            <DialogTrigger render={<Button variant="destructive" />}>
              Reject case
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject dp_3Qx9Kl2m?</DialogTitle>
                <DialogDescription>
                  This will mark the case as rejected and no evidence will be submitted. The dispute deadline will still apply.
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
            <DialogTrigger render={<Button />}>
              Submit Evidence
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit evidence packet?</DialogTitle>
                <DialogDescription>
                  This will submit the generated evidence to Stripe for dispute dp_7Yw2Mn8p. This action cannot be undone.
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
                  Stripe requires evidence submission by this date. Late submissions are automatically rejected.
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
              <CalendarIcon data-icon="inline-start" />
              4 sources
            </PopoverTrigger>
            <PopoverContent>
              <PopoverHeader>
                <PopoverTitle>Evidence Sources</PopoverTitle>
                <PopoverDescription>Data sources used to build this evidence packet.</PopoverDescription>
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
        <h3 className="mb-4">Case Detail Tabs</h3>
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="mt-4">
            <Card>
              <CardContent>
                <p className="text-muted-foreground">
                  Customer <code>cus_P4r5mN7q</code> completed signup on April 28, logged in 3 times, and
                  accessed the product dashboard before filing the dispute.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="evidence" className="mt-4">
            <Card>
              <CardContent>
                <p className="text-muted-foreground">Evidence packet content would appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardContent>
                <p className="text-muted-foreground">Event timeline would appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardContent>
                <p className="text-muted-foreground">Agent logs would appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      {/* Line tabs variant */}
      <section>
        <h3 className="mb-4">Line Tabs (Settings)</h3>
        <Tabs defaultValue="general">
          <TabsList variant="line">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
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
        </Tabs>
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
            { id: 'dp_7Yw2Mn8p', amount: '$89.00', type: 'Not received', status: 'Investigating', score: 45 },
            { id: 'dp_9Zk4Pq1n', amount: '$512.00', type: 'Duplicate', status: 'Submitted', score: 87 },
            { id: 'dp_2Ht6Wj5r', amount: '$34.99', type: 'Fraudulent', status: 'Lost', score: 31 },
          ].map((c) => (
            <div key={c.id} className="flex items-center gap-4 bg-background px-4 py-3 hover:bg-background-hover">
              <Checkbox />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <code className="text-xs">{c.id}</code>
                  <Badge variant="outline">{c.type}</Badge>
                </div>
                <small className="text-muted-foreground">{c.amount}</small>
              </div>
              <div className="flex items-center gap-3">
                <small className="tabular-nums text-muted-foreground">{c.score}/100</small>
                <Badge variant={
                  c.status === 'Won' ? 'success' :
                  c.status === 'Lost' ? 'destructive' :
                  c.status === 'Investigating' ? 'accent' :
                  'info'
                }>
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
                { label: 'New dispute received', desc: 'When Stripe sends a new dispute webhook', on: true },
                { label: 'Evidence submitted', desc: 'When an evidence packet is sent to Stripe', on: true },
                { label: 'Case resolved', desc: 'When a dispute outcome is decided', on: true },
                { label: 'Low confidence warning', desc: 'When score is below auto-submit threshold', on: false },
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
                Stripe webhook endpoint is unreachable. New disputes will not be detected until connectivity is restored.
              </CardDescription>
            </CardHeader>
            <CardFooter className="gap-2">
              <Button size="sm">Retry connection</Button>
              <Button variant="outline" size="sm">View logs</Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  ),
}

export const SidebarLayout: Story = {
  name: 'Sidebar Layout',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <SidebarProvider>
      <Sidebar>
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
                <SidebarMenuItem>
                  <SidebarMenuButton isActive>
                    <HouseIcon />
                    Dashboard
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <FolderIcon />
                    Cases
                    <SidebarMenuBadge>12</SidebarMenuBadge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <ChartBarIcon />
                    Analytics
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <PlugIcon />
                    Integrations
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
                    <SidebarMenuButton>
                      <code className="text-xs">{c.id}</code>
                      <SidebarMenuBadge>{c.status}</SidebarMenuBadge>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
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
          <h5>Dashboard</h5>
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
  ),
}
