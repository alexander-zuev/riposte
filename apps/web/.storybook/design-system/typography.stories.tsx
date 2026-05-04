import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from '@web/ui/components/ui/badge'
import { Button } from '@web/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/ui/components/ui/card'

const meta: Meta = {
  title: 'Design System/Typography',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

export const HeadingScale: Story = {
  name: 'Heading Scale',
  render: () => (
    <div className="space-y-8 p-8">
      <div className="space-y-6 border bg-surface p-6">
        <div className="flex items-baseline justify-between border-b border-dashed pb-4">
          <h1>Disputes Overview</h1>
          <code className="shrink-0 text-xs text-muted-foreground">
            h1 · 28px · bold · -0.025em
          </code>
        </div>
        <div className="flex items-baseline justify-between border-b border-dashed pb-4">
          <h2>Recent Cases</h2>
          <code className="shrink-0 text-xs text-muted-foreground">h2 · 24px · bold · -0.01em</code>
        </div>
        <div className="flex items-baseline justify-between border-b border-dashed pb-4">
          <h3>Case dp_3Qx9Kl2m</h3>
          <code className="shrink-0 text-xs text-muted-foreground">
            h3 · 20px · medium · -0.0075em
          </code>
        </div>
        <div className="flex items-baseline justify-between border-b border-dashed pb-4">
          <h4>Evidence Summary</h4>
          <code className="shrink-0 text-xs text-muted-foreground">
            h4 · 18px · medium · -0.00625em
          </code>
        </div>
        <div className="flex items-baseline justify-between border-b border-dashed pb-4">
          <h5>Source Details</h5>
          <code className="shrink-0 text-xs text-muted-foreground">h5 · 16px · medium</code>
        </div>
        <div className="flex items-baseline justify-between">
          <h6>Metadata</h6>
          <code className="shrink-0 text-xs text-muted-foreground">h6 · 14px · medium</code>
        </div>
      </div>

      {/* Where each heading level is used */}
      <div className="border bg-surface p-6">
        <h6 className="mb-3 text-muted-foreground">Usage rules</h6>
        <div className="space-y-2 text-xs">
          <div className="flex gap-4">
            <code className="w-8 shrink-0 text-muted-foreground">h1</code>
            <span>Page title. One per page. "Dashboard", "Settings", "Disputes"</span>
          </div>
          <div className="flex gap-4">
            <code className="w-8 shrink-0 text-muted-foreground">h2</code>
            <span>Page sections. "Recent Cases", "Analytics", "Integrations"</span>
          </div>
          <div className="flex gap-4">
            <code className="w-8 shrink-0 text-muted-foreground">h3</code>
            <span>Dialog/card titles. "Confirm Delete", "Edit Settings"</span>
          </div>
          <div className="flex gap-4">
            <code className="w-8 shrink-0 text-muted-foreground">h4</code>
            <span>Sub-sections, list headers. "Evidence Summary"</span>
          </div>
          <div className="flex gap-4">
            <code className="w-8 shrink-0 text-muted-foreground">h5</code>
            <span>Small card titles, component headers. CardTitle default</span>
          </div>
          <div className="flex gap-4">
            <code className="w-8 shrink-0 text-muted-foreground">h6</code>
            <span>Form sections, sidebar labels. "Personal Information"</span>
          </div>
        </div>
      </div>
    </div>
  ),
}

export const BodyText: Story = {
  name: 'Body & Inline Elements',
  render: () => (
    <div className="max-w-2xl space-y-6 p-8">
      <div className="space-y-1 border-b border-dashed pb-4">
        <code className="text-xs text-muted-foreground">
          {'<p>'} · 16px · regular · 1.5 line-height
        </code>
        <p>
          Riposte investigates what your user actually did, builds structured evidence from Stripe
          data, application logs, and product context, then submits it before the deadline.
        </p>
      </div>

      <div className="space-y-1 border-b border-dashed pb-4">
        <code className="text-xs text-muted-foreground">
          {'<small>'} · 12px · timestamps, metadata, legal
        </code>
        <small className="block">
          Updated 2 hours ago · Case opened by Stripe webhook · Due May 15, 2026
        </small>
      </div>

      <div className="space-y-1 border-b border-dashed pb-4">
        <code className="text-xs text-muted-foreground">
          {'<a>'} · medium weight, underline on hover
        </code>
        <p>
          View the <a href="#">evidence packet</a> or check the <a href="#">Stripe dashboard</a> for
          the original dispute.
        </p>
      </div>

      <div className="space-y-1 border-b border-dashed pb-4">
        <code className="text-xs text-muted-foreground">
          {'<strong>'} · medium weight (500), not bold
        </code>
        <p>
          The agent found <strong>4 matching log entries</strong> and{' '}
          <strong>2 successful API calls</strong> confirming product delivery.
        </p>
      </div>

      <div className="space-y-1 border-b border-dashed pb-4">
        <code className="text-xs text-muted-foreground">
          {'<code>'} · JetBrains Mono, muted bg, 0.95em
        </code>
        <p>
          Dispute <code>dp_3Qx9Kl2m</code> was triggered by charge <code>ch_1NqHv2L...</code> on
          customer <code>cus_P4r5...</code>.
        </p>
      </div>

      <div className="space-y-1">
        <code className="text-xs text-muted-foreground">
          {'<blockquote>'} · italic, left border, indented
        </code>
        <blockquote>
          Riposte found supporting usage evidence across 3 data sources and built an evidence packet
          with a 92% confidence score.
        </blockquote>
      </div>
    </div>
  ),
}

export const TypographyInContext: Story = {
  name: 'Case Detail Page',
  render: () => (
    <div className="max-w-3xl space-y-8 p-8">
      {/* Page header — h1 + description + status */}
      <div className="flex items-center justify-between">
        <div>
          <h1>dp_3Qx9Kl2m</h1>
          <p className="text-muted-foreground">Fraudulent charge dispute · $249.00</p>
        </div>
        <Badge variant="success">Won</Badge>
      </div>

      {/* Agent summary — Card with h5 (CardTitle), p, code, strong */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Summary</CardTitle>
          <CardDescription>Auto-generated by Riposte on May 2, 2026</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>
            Customer <code>cus_P4r5mN7q</code> completed signup on April 28, logged in 3 times over
            2 days, and accessed the product dashboard before filing the dispute. IP geolocation
            matches billing address.
          </p>
          <p className="text-muted-foreground">
            Evidence score: <strong className="text-foreground">92/100</strong> — high confidence
            based on 4 corroborating sources.
          </p>
        </CardContent>
      </Card>

      {/* Section header — h3, then small cards with h6 */}
      <div>
        <h3 className="mb-4">Sources Used</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: 'Stripe Events', count: '12 events' },
            { name: 'Application Logs', count: '4 entries' },
            { name: 'Auth Sessions', count: '3 sessions' },
            { name: 'API Requests', count: '8 requests' },
          ].map((source) => (
            <Card key={source.name} size="sm">
              <CardContent className="flex items-center justify-between">
                <h6>{source.name}</h6>
                <small className="text-muted-foreground">{source.count}</small>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Timeline — code for timestamps, p for events, semantic text colors */}
      <div>
        <h3 className="mb-4">Event Timeline</h3>
        <div className="space-y-3 border-l-2 border-border pl-4">
          {[
            { time: '2026-04-28 09:12', event: 'Customer signed up' },
            { time: '2026-04-28 14:33', event: 'First product access' },
            { time: '2026-04-29 11:07', event: 'Dashboard viewed (3 pages)' },
            {
              time: '2026-05-01 08:45',
              event: 'Dispute opened by cardholder',
              cls: 'text-warning-muted-foreground',
            },
            {
              time: '2026-05-02 02:15',
              event: 'Evidence packet submitted',
              cls: 'text-success-muted-foreground',
            },
            {
              time: '2026-05-10 16:00',
              event: 'Dispute resolved — won',
              cls: 'text-success-muted-foreground',
            },
          ].map((entry) => (
            <div key={entry.time} className="flex gap-4">
              <code className="shrink-0 text-xs text-muted-foreground">{entry.time}</code>
              <p className={entry.cls || ''}>{entry.event}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
}

export const WeightScale: Story = {
  name: 'Weight Scale',
  render: () => (
    <div className="space-y-10 p-8">
      <div>
        <h6 className="mb-4 text-muted-foreground">
          Inter — default UI font (headings, body, labels, buttons)
        </h6>
        <div className="space-y-3 border bg-surface p-6">
          <p className="font-regular">
            Regular 400 — Riposte investigates real user activity and builds structured evidence.
          </p>
          <p className="font-medium">
            Medium 500 — Riposte investigates real user activity and builds structured evidence.
          </p>
          <p className="font-semibold">
            Semibold 600 — Riposte investigates real user activity and builds structured evidence.
          </p>
          <p className="font-bold">
            Bold 700 — Riposte investigates real user activity and builds structured evidence.
          </p>
        </div>
      </div>

      <div>
        <h6 className="mb-4 text-muted-foreground">
          JetBrains Mono — system truth (IDs, timestamps, logs, metadata, code)
        </h6>
        <div className="space-y-3 border bg-surface p-6">
          <p className="font-mono font-regular">
            Regular 400 — dp_3Qx9Kl2m · cus_P4r5mN7q · 2026-05-02 02:15
          </p>
          <p className="font-mono font-medium">
            Medium 500 — dp_3Qx9Kl2m · cus_P4r5mN7q · 2026-05-02 02:15
          </p>
          <p className="font-mono font-semibold">
            Semibold 600 — dp_3Qx9Kl2m · cus_P4r5mN7q · 2026-05-02 02:15
          </p>
          <p className="font-mono font-bold">
            Bold 700 — dp_3Qx9Kl2m · cus_P4r5mN7q · 2026-05-02 02:15
          </p>
        </div>
      </div>

      <div>
        <h6 className="mb-4 text-muted-foreground">
          Weights in context — how headings and body pair
        </h6>
        <div className="space-y-4 border bg-surface p-6">
          <h1>h1 Bold — Disputes Overview</h1>
          <p>
            Body regular — The agent monitors incoming Stripe disputes and builds evidence packets
            automatically.
          </p>
          <h3>h3 Medium — Case dp_3Qx9Kl2m</h3>
          <p className="text-muted-foreground">
            Muted body — Opened May 1, 2026 via webhook. Due in 14 days.
          </p>
          <h6>h6 Medium — Evidence Sources</h6>
          <small>Small regular — Updated 2 hours ago · 4 sources matched</small>
        </div>
      </div>

      <div>
        <h6 className="mb-4 text-muted-foreground">Weights in components</h6>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Submit Evidence</Button>
          <Button variant="outline">View Details</Button>
          <Button variant="ghost">Dismiss</Button>
          <Badge variant="success">Won</Badge>
          <Badge variant="destructive">Lost</Badge>
          <Badge variant="accent">Investigating</Badge>
        </div>
      </div>
    </div>
  ),
}

export const DisplayTypography: Story = {
  name: 'Display & Marketing',
  render: () => (
    <div className="space-y-10 p-8">
      {/* Scale reference */}
      <div className="space-y-6">
        <div className="border-b border-dashed pb-4">
          <code className="text-xs text-muted-foreground">
            .text-display-hero · 36→60px fluid · bold · -0.05em
          </code>
          <p className="text-display-hero mt-1">Stripe disputes, answered automatically.</p>
        </div>
        <div className="border-b border-dashed pb-4">
          <code className="text-xs text-muted-foreground">
            .text-display · 28px · bold · -0.045em
          </code>
          <p className="text-display mt-1">Evidence that wins. Built by an AI agent.</p>
        </div>
        <div>
          <code className="text-xs text-muted-foreground">
            .text-subtitle · 20px · regular · -0.02em
          </code>
          <p className="text-subtitle mt-1 text-muted-foreground">
            Riposte investigates real user activity, builds structured evidence, and submits it to
            Stripe — before the deadline.
          </p>
        </div>
      </div>

      {/* Landing hero mockup — realistic composition */}
      <div className="border bg-surface p-12 text-center">
        <small className="mb-4 block text-muted-foreground">
          ↓ Landing hero mockup — uses .text-display-hero + .text-subtitle + Button
        </small>
        <p className="text-display-hero">
          Stripe disputes,
          <br />
          answered automatically.
        </p>
        <p className="text-subtitle mx-auto mt-4 max-w-xl text-muted-foreground">
          Riposte investigates what your user actually did, builds structured evidence, and submits
          it to Stripe.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button>Get started</Button>
          <Button variant="outline">See how it works</Button>
        </div>
      </div>
    </div>
  ),
}
