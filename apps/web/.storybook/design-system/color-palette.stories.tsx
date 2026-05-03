import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '@web/ui/components/ui/badge'
import { Button } from '@web/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@web/ui/components/ui/card'
import { Input } from '@web/ui/components/ui/input'

const meta: Meta = {
  title: 'Design System/Colors',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

function Token({ name, token, className }: { name: string; token: string; className: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className={`h-10 w-full border border-border ${className}`} />
      <span className="text-xs font-medium">{name}</span>
      <code className="text-xs text-muted-foreground">{token}</code>
    </div>
  )
}

export const SurfaceHierarchy: Story = {
  name: 'Surface Hierarchy',
  render: () => (
    <div className="space-y-10 p-8">
      {/* Layer stack — the actual hierarchy from colors.css */}
      <div className="border-2 border-dashed border-border bg-background p-6">
        <div className="mb-1 flex items-center gap-2">
          <code className="text-xs text-muted-foreground">--background</code>
          <span className="text-xs text-muted-foreground">gray-1 · body, main canvas, dialogs</span>
        </div>

        <div className="mt-4 border bg-surface p-6 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <code className="text-xs text-muted-foreground">--surface</code>
            <span className="text-xs text-muted-foreground">gray-2 · cards, sidebar, panels</span>
          </div>

          <div className="mt-4 flex gap-3">
            <div className="border bg-muted px-3 py-2">
              <code className="text-xs text-muted-foreground">--muted</code>
              <span className="ml-2 text-xs text-muted-foreground">gray-3</span>
            </div>
            <div className="border bg-surface-hover px-3 py-2">
              <code className="text-xs text-muted-foreground">--surface-hover</code>
              <span className="ml-2 text-xs text-muted-foreground">gray-4</span>
            </div>
            <div className="border bg-surface-active px-3 py-2">
              <code className="text-xs text-muted-foreground">--surface-active</code>
              <span className="ml-2 text-xs text-muted-foreground">gray-5</span>
            </div>
          </div>

          <div className="mt-4 max-w-xs border bg-popover p-4 shadow-md">
            <div className="flex items-center gap-2">
              <code className="text-xs text-muted-foreground">--popover</code>
              <span className="text-xs text-muted-foreground">
                gray-2 + shadow · dropdowns, tooltips
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real dispute cards using these layers */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>dp_3Qx9Kl2m</CardTitle>
            <CardDescription>Fraudulent · $249.00 · Due May 15</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="accent">Investigating</Badge>
          </CardContent>
          <CardFooter>
            <div className="flex w-full items-center justify-between">
              <small className="text-muted-foreground">Opened 2h ago</small>
              <Button variant="ghost" size="xs">
                View
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>dp_7Rm4Np8v</CardTitle>
            <CardDescription>Product not received · $89.00</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="success">Submitted</Badge>
          </CardContent>
          <CardFooter>
            <div className="flex w-full items-center justify-between">
              <small className="text-muted-foreground">Score 87/100</small>
              <Button variant="ghost" size="xs">
                View
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>dp_2Wf6Bt3j</CardTitle>
            <CardDescription>Subscription canceled · $39.00/mo</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant="destructive">Lost</Badge>
          </CardContent>
          <CardFooter>
            <div className="flex w-full items-center justify-between">
              <small className="text-muted-foreground">Insufficient evidence</small>
              <Button variant="ghost" size="xs">
                View
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  ),
}

export const SemanticColors: Story = {
  name: 'Semantic Colors',
  render: () => (
    <div className="space-y-10 p-8">
      {/* Each semantic intent: solid (step 9), muted bg (step 3), text (step 11) */}
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Token name="Solid" token="green-9" className="bg-success" />
            <Token name="Muted" token="green-3" className="bg-success-muted" />
            <Token name="Hover" token="green-4" className="bg-success-muted-hover" />
          </div>
          <div className="border bg-success-muted p-3">
            <small className="font-medium text-success-muted-foreground">Won</small>
            <small className="ml-2 text-success-muted-foreground">$249.00 recovered</small>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Token name="Solid" token="amber-9" className="bg-warning" />
            <Token name="Muted" token="amber-3" className="bg-warning-muted" />
            <Token name="Hover" token="amber-4" className="bg-warning-muted-hover" />
          </div>
          <div className="border bg-warning-muted p-3">
            <small className="font-medium text-warning-muted-foreground">Due in 3 days</small>
            <small className="ml-2 text-warning-muted-foreground">Respond now</small>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Token name="Solid" token="red-9" className="bg-destructive" />
            <Token name="Muted" token="red-3" className="bg-destructive-muted" />
            <Token name="Hover" token="red-4" className="bg-destructive-muted-hover" />
          </div>
          <div className="border bg-destructive-muted p-3">
            <small className="font-medium text-destructive-muted-foreground">Lost</small>
            <small className="ml-2 text-destructive-muted-foreground">Evidence insufficient</small>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Token name="Solid" token="blue-9" className="bg-info" />
            <Token name="Muted" token="blue-3" className="bg-info-muted" />
            <Token name="Hover" token="blue-4" className="bg-info-muted-hover" />
          </div>
          <div className="border bg-info-muted p-3">
            <small className="font-medium text-info-muted-foreground">New</small>
            <small className="ml-2 text-info-muted-foreground">3 disputes received</small>
          </div>
        </div>
      </div>

      {/* Accent — lime, used sparingly */}
      <div>
        <h6 className="mb-3 text-muted-foreground">
          Accent (lime) — evidence highlights, primary emphasis
        </h6>
        <div className="grid grid-cols-4 gap-2 md:max-w-md">
          <Token name="Solid" token="lime-9" className="bg-accent" />
          <Token name="Hover" token="lime-10" className="bg-accent-hover" />
          <Token name="Muted" token="lime-3" className="bg-accent-muted" />
          <Token name="Active" token="lime-7" className="bg-accent-active" />
        </div>
      </div>

      {/* Chart palette */}
      <div>
        <h6 className="mb-3 text-muted-foreground">
          Chart colors — 5-color palette for data visualization
        </h6>
        <div className="flex gap-2">
          {[
            { name: 'lime-9', cls: 'bg-chart-1' },
            { name: 'amber-9', cls: 'bg-chart-2' },
            { name: 'green-9', cls: 'bg-chart-3' },
            { name: 'gray-9', cls: 'bg-chart-4' },
            { name: 'red-9', cls: 'bg-chart-5' },
          ].map((c) => (
            <div key={c.name} className="flex flex-col items-center gap-1">
              <div className={`h-8 w-12 border border-border ${c.cls}`} />
              <code className="text-xs text-muted-foreground">{c.name}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
}

export const BordersAndStates: Story = {
  name: 'Borders & Interactive States',
  render: () => (
    <div className="space-y-10 p-8">
      {/* Border scale */}
      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-2">
          <div className="h-12 border-2 border-border-non-interactive bg-background" />
          <code className="text-xs">border-non-interactive</code>
          <small className="block text-muted-foreground">
            gray-6 · card edges, dividers, separators
          </small>
        </div>
        <div className="space-y-2">
          <div className="h-12 border-2 border-border-interactive bg-background" />
          <code className="text-xs">border-interactive</code>
          <small className="block text-muted-foreground">
            gray-7 · input borders, clickable elements
          </small>
        </div>
        <div className="space-y-2">
          <div className="h-12 border-2 border-border-interactive-strong bg-background" />
          <code className="text-xs">border-interactive-strong</code>
          <small className="block text-muted-foreground">gray-8 · focus, hover borders</small>
        </div>
      </div>

      {/* Error border scale */}
      <div>
        <h6 className="mb-3 text-muted-foreground">
          Destructive border scale — error inputs, validation
        </h6>
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="h-12 border-2 border-border-destructive-non-interactive bg-background" />
            <code className="text-xs">red-6</code>
          </div>
          <div className="space-y-2">
            <div className="h-12 border-2 border-border-destructive-interactive bg-background" />
            <code className="text-xs">red-7</code>
          </div>
          <div className="space-y-2">
            <div className="h-12 border-2 border-border-destructive-interactive-strong bg-background" />
            <code className="text-xs">red-8</code>
          </div>
        </div>
      </div>

      {/* Inputs in real context */}
      <div>
        <h6 className="mb-3 text-muted-foreground">Input states — Stripe integration form</h6>
        <div className="grid max-w-md grid-cols-1 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">API key</label>
            <Input placeholder="sk_live_..." />
            <small className="text-muted-foreground">gray-7 default border</small>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Webhook secret</label>
            <Input placeholder="whsec_..." className="border-ring ring-1 ring-ring" />
            <small className="text-muted-foreground">ring-ring (lime-a8) · focus state</small>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Invalid key</label>
            <Input placeholder="sk_test_expired..." aria-invalid="true" />
            <small className="text-destructive-muted-foreground">
              red destructive border + ring
            </small>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Connected</label>
            <Input placeholder="sk_live_•••••••K2m" disabled />
            <small className="text-muted-foreground">50% opacity, no pointer events</small>
          </div>
        </div>
      </div>
    </div>
  ),
}

export const TextForegrounds: Story = {
  name: 'Text & Foreground Colors',
  render: () => (
    <div className="space-y-10 p-8">
      {/* Primary hierarchy in a real case detail */}
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>
            dp_3Qx9Kl2m
            <span className="ml-2 text-xs font-normal text-muted-foreground">· Fraudulent</span>
          </CardTitle>
          <CardDescription>Opened May 1, 2026 via Stripe webhook</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">$249.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Evidence score</span>
            <span className="font-medium">92/100</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Due date</span>
            <span className="text-warning-muted-foreground">May 15, 2026</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="text-success-muted-foreground">Evidence submitted</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sources</span>
            <span>4 matched</span>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          <code className="text-xs">foreground</code>
          <span className="mx-1">= gray-12 ·</span>
          <code className="text-xs">muted-foreground</code>
          <span className="mx-1">= gray-11</span>
        </CardFooter>
      </Card>

      {/* Text on solid semantic backgrounds */}
      <div>
        <h6 className="mb-3 text-muted-foreground">Foreground on solid backgrounds</h6>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="bg-accent p-4">
            <h6 className="text-accent-foreground">Accent</h6>
            <small className="text-accent-foreground-low-contrast">gray-12 on lime-9</small>
          </div>
          <div className="bg-success p-4">
            <h6 className="text-success-foreground">Success</h6>
            <small className="text-success-foreground-low-contrast">gray-1 on green-9</small>
          </div>
          <div className="bg-destructive p-4">
            <h6 className="text-destructive-foreground">Destructive</h6>
            <small className="text-destructive-foreground-low-contrast">gray-1 on red-9</small>
          </div>
          <div className="bg-info p-4">
            <h6 className="text-info-foreground">Info</h6>
            <small className="text-info-foreground-low-contrast">gray-1 on blue-9</small>
          </div>
        </div>
      </div>

      {/* Low-contrast foreground demo */}
      <div>
        <h6 className="mb-3 text-muted-foreground">
          Low-contrast foregrounds — secondary info on solid bg
        </h6>
        <div className="flex gap-3">
          <div className="bg-accent px-4 py-3">
            <span className="text-accent-foreground">Submit</span>
            <span className="ml-2 text-accent-foreground-low-contrast">3 cases</span>
          </div>
          <div className="bg-success px-4 py-3">
            <span className="text-success-foreground">Won</span>
            <span className="ml-2 text-success-foreground-low-contrast">$249</span>
          </div>
          <div className="bg-destructive px-4 py-3">
            <span className="text-destructive-foreground">Lost</span>
            <span className="ml-2 text-destructive-foreground-low-contrast">$89</span>
          </div>
        </div>
      </div>
    </div>
  ),
}
