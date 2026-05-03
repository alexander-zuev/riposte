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
  title: 'Design System/Tokens',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

export const RadiusScale: Story = {
  name: 'Radius Scale',
  render: () => (
    <div className="space-y-8 p-8">
      <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
        {[
          { name: 'xs', token: '3px × factor', cls: 'rounded-xs' },
          { name: 'sm', token: '4px × factor', cls: 'rounded-sm' },
          { name: 'md', token: '6px × factor', cls: 'rounded-md' },
          { name: 'lg', token: '8px × factor', cls: 'rounded-lg' },
          { name: 'xl', token: '12px × factor', cls: 'rounded-xl' },
          { name: '2xl', token: '16px × factor', cls: 'rounded-2xl' },
        ].map((r) => (
          <div key={r.name} className="space-y-2 text-center">
            <div className={`mx-auto h-16 w-16 border-2 border-border bg-surface ${r.cls}`} />
            <code className="text-xs">{r.name}</code>
            <small className="block text-muted-foreground">{r.token}</small>
          </div>
        ))}
      </div>

      <div className="border bg-surface p-4">
        <h6 className="mb-2 text-muted-foreground">--radius-factor: 0 (current)</h6>
        <p className="text-xs text-muted-foreground">
          All components render with sharp corners. Set factor to 1.0 for default rounding, 1.5 for
          rounded. The scale multiplies base pixel values by the factor.
        </p>
        <div className="mt-3 flex flex-wrap items-start gap-3">
          <Badge>badge</Badge>
          <Button size="xs">xs button</Button>
          <Button>button</Button>
          <Input className="w-40" placeholder="input" />
        </div>
      </div>
    </div>
  ),
}

export const SpacingSystem: Story = {
  name: 'Spacing System',
  render: () => (
    <div className="space-y-8 p-8">
      {/* Spacing scale */}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {[
          { name: 'gap-sm', size: '8px', use: 'Label → input, between form fields' },
          { name: 'gap-md', size: '16px', use: 'Card internals, related blocks' },
          { name: 'gap-lg', size: '24px', use: 'Between cards, sidebar items' },
          { name: 'gap-xl', size: '32px', use: 'Between page sections' },
        ].map((s) => (
          <div key={s.name} className="space-y-2">
            <div className="flex items-end gap-1">
              <div className="w-full border-t-2 border-accent" />
              <div className="shrink-0 border-l-2 border-accent" style={{ height: s.size }} />
              <div className="w-full border-t-2 border-accent" />
            </div>
            <code className="text-xs">{s.name}</code>
            <small className="block text-muted-foreground">
              {s.size} · {s.use}
            </small>
          </div>
        ))}
      </div>

      {/* Spacing in a real form */}
      <div>
        <small className="mb-3 block text-muted-foreground">
          ↓ Real form — gap-sm between label/input, gap-md between fields, card-padding inside
        </small>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Stripe Integration</CardTitle>
            <CardDescription>
              Connect your Stripe account to start monitoring disputes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-sm">
              <label className="text-xs font-medium">API Key</label>
              <Input placeholder="sk_live_..." />
            </div>
            <div className="mt-4 flex flex-col gap-sm">
              <label className="text-xs font-medium">Webhook Secret</label>
              <Input placeholder="whsec_..." />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Connect</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  ),
}

export const ButtonVariants: Story = {
  name: 'Button Variants & Sizes',
  render: () => (
    <div className="space-y-8 p-8">
      {/* Variant matrix */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left text-xs font-medium">Variant</th>
              <th className="px-3 py-2 text-center text-xs font-medium">Default</th>
              <th className="px-3 py-2 text-center text-xs font-medium">Hover it</th>
              <th className="px-3 py-2 text-center text-xs font-medium">Disabled</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(
              [
                ['default', 'Submit Evidence'],
                ['outline', 'View Details'],
                ['secondary', 'Export'],
                ['ghost', 'Dismiss'],
                ['destructive', 'Delete Case'],
                ['link', 'Learn more'],
              ] as const
            ).map(([variant, label]) => (
              <tr key={variant}>
                <td className="px-3 py-3">
                  <code className="text-xs">{variant}</code>
                </td>
                <td className="px-3 py-3 text-center">
                  <Button variant={variant} size="sm">
                    {label}
                  </Button>
                </td>
                <td className="px-3 py-3 text-center">
                  <Button variant={variant} size="sm">
                    {label}
                  </Button>
                </td>
                <td className="px-3 py-3 text-center">
                  <Button variant={variant} size="sm" disabled>
                    {label}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sizes */}
      <div>
        <h6 className="mb-3 text-muted-foreground">Size scale</h6>
        <div className="flex flex-wrap items-center gap-3">
          {[
            { size: 'xs' as const, h: '24px' },
            { size: 'sm' as const, h: '28px' },
            { size: 'default' as const, h: '32px' },
            { size: 'lg' as const, h: '36px' },
          ].map((s) => (
            <Button key={s.size} size={s.size}>
              {s.size} · {s.h}
            </Button>
          ))}
          <span className="mx-2 text-xs text-muted-foreground">|</span>
          <Button size="icon-xs">+</Button>
          <Button size="icon-sm">+</Button>
          <Button size="icon">+</Button>
          <Button size="icon-lg">+</Button>
        </div>
      </div>

      {/* Real button patterns */}
      <div>
        <h6 className="mb-3 text-muted-foreground">Common patterns</h6>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button>Submit to Stripe</Button>
              <Button variant="outline">Save draft</Button>
            </div>
            <small className="text-muted-foreground">primary + secondary</small>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <Button variant="destructive">Delete case</Button>
              <Button variant="ghost">Cancel</Button>
            </div>
            <small className="text-muted-foreground">destructive confirmation</small>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-1 border p-1">
              <Button variant="ghost" size="xs">
                All
              </Button>
              <Button variant="ghost" size="xs" className="bg-surface-hover">
                Open
              </Button>
              <Button variant="ghost" size="xs">
                Won
              </Button>
              <Button variant="ghost" size="xs">
                Lost
              </Button>
            </div>
            <small className="text-muted-foreground">filter tabs</small>
          </div>
        </div>
      </div>
    </div>
  ),
}

export const BadgeVariants: Story = {
  name: 'Badge & Status Patterns',
  render: () => (
    <div className="space-y-8 p-8">
      {/* Dispute lifecycle badges */}
      <div>
        <h6 className="mb-3 text-muted-foreground">Dispute lifecycle — muted bg + step 11 text</h6>
        <div className="flex flex-wrap gap-3">
          <Badge variant="info">New</Badge>
          <Badge variant="accent">Investigating</Badge>
          <Badge variant="success">Evidence Built</Badge>
          <Badge variant="success">Submitted</Badge>
          <Badge variant="success">Won</Badge>
          <Badge variant="destructive">Lost</Badge>
          <Badge variant="warning">Needs Review</Badge>
        </div>
      </div>

      {/* Built-in variants */}
      <div>
        <h6 className="mb-3 text-muted-foreground">Built-in badge variants</h6>
        <div className="flex flex-wrap gap-3">
          <Badge variant="default">default</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="destructive">destructive</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="ghost">ghost</Badge>
        </div>
      </div>

      {/* Real table */}
      <div>
        <small className="mb-3 block text-muted-foreground">
          ↓ Cases table — badges in context
        </small>
        <div className="overflow-x-auto border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-surface">
                <th className="px-3 py-2 text-left text-xs font-medium">Case</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Reason</th>
                <th className="px-3 py-2 text-right text-xs font-medium">Amount</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs">
              <tr>
                <td className="px-3 py-2">
                  <code>dp_3Qx9Kl2m</code>
                </td>
                <td className="px-3 py-2">Fraudulent</td>
                <td className="px-3 py-2 text-right font-medium">$249.00</td>
                <td className="px-3 py-2">
                  <Badge variant="success">Won</Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground">May 10</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <code>dp_7Rm4Np8v</code>
                </td>
                <td className="px-3 py-2">Product not received</td>
                <td className="px-3 py-2 text-right font-medium">$89.00</td>
                <td className="px-3 py-2">
                  <Badge variant="accent">Investigating</Badge>
                </td>
                <td className="px-3 py-2 text-warning-muted-foreground">May 15</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <code>dp_2Wf6Bt3j</code>
                </td>
                <td className="px-3 py-2">Subscription canceled</td>
                <td className="px-3 py-2 text-right font-medium">$39.00</td>
                <td className="px-3 py-2">
                  <Badge variant="destructive">Lost</Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground">Apr 28</td>
              </tr>
              <tr>
                <td className="px-3 py-2">
                  <code>dp_9Ks1Wt5p</code>
                </td>
                <td className="px-3 py-2">Duplicate</td>
                <td className="px-3 py-2 text-right font-medium">$150.00</td>
                <td className="px-3 py-2">
                  <Badge variant="warning">Needs Review</Badge>
                </td>
                <td className="px-3 py-2 text-destructive-muted-foreground">Tomorrow</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ),
}
