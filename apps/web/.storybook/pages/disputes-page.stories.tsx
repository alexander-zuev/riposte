import type { ListDisputeCasesResult } from '@riposte/core/client'
import { seedStorybookQuery } from '@storybook-local/query-client'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { disputeQueries } from '@web/entities/disputes/dispute-queries'
import { DisputesPage } from '@web/pages/authed/disputes/disputes-page'

const defaultDisputesQuery = disputeQueries.list()

const seededDisputes = {
  items: [
    {
      disputeId: 'du_1TV71GDGi8KWRsUNvG3hzUMF',
      workflowStatus: 'needs_input',
      stripeStatus: 'needs_response',
      reason: 'fraudulent',
      amount: { amountMinor: 222, currency: 'usd' },
      evidenceDueBy: '2026-05-18T00:00:00.000Z',
      stripeCreatedAt: '2026-05-09T10:17:00.000Z',
      updatedAt: '2026-05-09T10:20:00.000Z',
    },
    {
      disputeId: 'du_ready_review_001',
      workflowStatus: 'ready_for_review',
      stripeStatus: 'warning_needs_response',
      reason: 'subscription_canceled',
      amount: { amountMinor: 9900, currency: 'usd' },
      evidenceDueBy: '2026-05-13T18:00:00.000Z',
      stripeCreatedAt: '2026-05-08T14:32:00.000Z',
      updatedAt: '2026-05-09T11:05:00.000Z',
    },
    {
      disputeId: 'du_collecting_002',
      workflowStatus: 'collecting_evidence',
      stripeStatus: 'under_review',
      reason: 'product_not_received',
      amount: { amountMinor: 34900, currency: 'usd' },
      evidenceDueBy: '2026-05-21T09:00:00.000Z',
      stripeCreatedAt: '2026-05-07T08:15:00.000Z',
      updatedAt: '2026-05-09T09:10:00.000Z',
    },
    {
      disputeId: 'du_won_003',
      workflowStatus: 'won',
      stripeStatus: 'won',
      reason: 'duplicate',
      amount: { amountMinor: 4900, currency: 'usd' },
      evidenceDueBy: '2026-05-04T00:00:00.000Z',
      stripeCreatedAt: '2026-04-19T16:45:00.000Z',
      updatedAt: '2026-05-06T12:00:00.000Z',
    },
  ],
  nextCursor: null,
} satisfies ListDisputeCasesResult

const meta = {
  title: 'Pages/Disputes',
  component: DisputesPage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => {
      seedStorybookQuery(defaultDisputesQuery.queryKey, seededDisputes)

      return (
        <div className="min-h-screen bg-background p-8">
          <Story />
        </div>
      )
    },
  ],
} satisfies Meta<typeof DisputesPage>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {}
