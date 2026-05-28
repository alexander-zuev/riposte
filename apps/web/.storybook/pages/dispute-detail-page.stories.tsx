import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { DisputeDetailPage } from '@web/pages/authed/disputes/dispute-detail-page'

const meta = {
  title: 'Pages/Dispute Detail',
  component: DisputeDetailPage,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Case-scoped detail surface. Audit/activity log lives on the /agent page (single source of truth across disputes); this page covers state, evidence, and founder input for one case.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DisputeDetailPage>

export default meta
type Story = StoryObj<typeof meta>

export const Stub: Story = {
  args: { disputeId: 'du_1TV71GDGi8KWRsUNvG3hzUMF' },
}
