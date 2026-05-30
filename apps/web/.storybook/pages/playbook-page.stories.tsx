import type { ReadProductDisputeSetupResult } from '@riposte/core/client'
import type { Meta, StoryObj } from '@storybook/tanstack-react'
import {
  PlaybookErrorState,
  PlaybookPending,
  PlaybookView,
} from '@web/pages/authed/products/playbook-view'

const PLAYBOOK_MD = `# Spawnbase Dispute Playbook

## Customer matching
Verify the strict join from Stripe \`charge.customer\` to the merchant app's stored \`auth.user.stripe_customer_id\`.
Source: \`auth.user.stripe_customer_id\`

## Activity sources
Successful product use is verified through:
1. **LLM Usage Events**: rows in \`public.usage_event\` where \`user_id\` matches the matched user.
2. **Workflow Executions**: rows in \`public.workflow_instance\` associated with the user.

## Known constraints
- Use \`auth.user.stripe_customer_id\` for matching.
- Only count \`workflow_instance.status = 'completed'\` as successful delivery.
`

const evidence: ReadProductDisputeSetupResult['evidence'] = {
  productDescription:
    'Spawnbase is an AI agent orchestration platform where users build, test, and run agentic workflows using large language models and third-party integrations.',
  serviceStartRule: 'verified_usage',
  refundPolicyDisclosure: 'Linked from /terms',
  cancellationPolicyDisclosure: 'Linked from /terms',
}

const completeSetup: ReadProductDisputeSetupResult = {
  playbook: {
    revision: 1,
    content: PLAYBOOK_MD,
    createdAt: '2026-05-30T10:00:00.000Z',
    validation: { complete: true, remaining: [] },
  },
  evidence,
}

const incompleteSetup: ReadProductDisputeSetupResult = {
  playbook: {
    revision: 2,
    content: PLAYBOOK_MD,
    createdAt: '2026-05-30T10:00:00.000Z',
    validation: {
      complete: false,
      remaining: [
        { section: 'Refund request detection', issue: 'too_short' },
        { section: 'Visual deliverables', issue: 'missing' },
        { section: 'Customer matching', issue: 'no_source' },
      ],
    },
  },
  evidence,
}

const meta = {
  title: 'Pages/Playbook',
  component: PlaybookView,
  parameters: { layout: 'fullscreen' },
  args: {
    productId: 'prod_demo',
    productName: 'Spawnbase',
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PlaybookView>

export default meta
type Story = StoryObj<typeof meta>

export const Pending: Story = {
  render: () => <PlaybookPending />,
}

export const ErrorState: Story = {
  render: () => <PlaybookErrorState onRetry={() => undefined} />,
}

export const ValidationIncomplete: Story = {
  args: { data: incompleteSetup },
}

export const Complete: Story = {
  args: { data: completeSetup },
}
