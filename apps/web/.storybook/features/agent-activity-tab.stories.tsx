import type { ListDisputeCaseActivityResult } from '@riposte/core/client'
import { setDisputeCaseActivityMockState } from '@storybook-local/mocks/dispute-case-message.fn'
import { storybookQueryClient } from '@storybook-local/query-client'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ActivityTab } from '@web/features/agent/activity-tab'

const productId = '226dd7e2-81a9-4ae7-87c7-9087321676ce'

const populatedActivity = {
  cases: [
    {
      disputeCaseId: 'du_older_001',
      messages: [
        {
          id: '018fc37c-85ee-7000-9000-000000000003',
          productId,
          disputeCaseId: 'du_older_001',
          runId: '4a802f5b-e4ba-4dfc-a69d-a2d9038f9bfb',
          messageId: 'msg_older_start',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Loaded Stripe charge and customer context.' }],
          createdAt: '2026-05-27T09:54:00.000Z',
        },
        {
          id: '018fc37c-85ee-7000-9000-000000000004',
          productId,
          disputeCaseId: 'du_older_001',
          runId: '4a802f5b-e4ba-4dfc-a69d-a2d9038f9bfb',
          messageId: 'msg_older_match',
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'Matched the Stripe customer id to the merchant user and found 28 delivered events.',
            },
          ],
          createdAt: '2026-05-27T09:56:00.000Z',
        },
      ],
    },
    {
      disputeCaseId: 'du_recent_002',
      messages: [
        {
          id: '018fc37c-85ee-7000-9000-000000000001',
          productId,
          disputeCaseId: 'du_recent_002',
          runId: '6d05eb97-bc98-4638-8ef3-e7393c875918',
          messageId: 'msg_recent_start',
          role: 'assistant',
          parts: [{ type: 'text', text: 'Started evidence collection for the dispute.' }],
          createdAt: '2026-05-27T10:12:00.000Z',
        },
        {
          id: '018fc37c-85ee-7000-9000-000000000002',
          productId,
          disputeCaseId: 'du_recent_002',
          runId: '6d05eb97-bc98-4638-8ef3-e7393c875918',
          messageId: 'msg_recent_tool',
          role: 'assistant',
          parts: [
            {
              type: 'dynamic-tool',
              toolName: 'getDisputeCase',
              toolCallId: 'call_get_dispute_case',
              state: 'output-available',
              input: { disputeCaseId: 'du_recent_002' },
              output: { stripeReason: 'fraudulent', amount: '$20.00' },
            },
          ],
          createdAt: '2026-05-27T10:13:00.000Z',
        },
      ],
    },
  ],
} satisfies ListDisputeCaseActivityResult

function resetQueryCache() {
  storybookQueryClient.clear()
}

const meta = {
  title: 'Features/Agent/Activity Tab',
  component: ActivityTab,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background p-8">
        <div className="h-[calc(100vh-19rem)] max-w-4xl border border-border">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof ActivityTab>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  args: { mode: 'setup', productId },
  beforeEach: () => {
    resetQueryCache()
    setDisputeCaseActivityMockState({ status: 'success', data: populatedActivity })
  },
}

export const Empty: Story = {
  args: { mode: 'setup', productId },
  beforeEach: () => {
    resetQueryCache()
    setDisputeCaseActivityMockState({ status: 'success', data: { cases: [] } })
  },
}

export const Loading: Story = {
  args: { mode: 'setup', productId },
  beforeEach: () => {
    resetQueryCache()
    setDisputeCaseActivityMockState({ status: 'loading' })
  },
}

export const Error: Story = {
  args: { mode: 'setup', productId },
  beforeEach: () => {
    resetQueryCache()
    setDisputeCaseActivityMockState({
      status: 'error',
      message: 'Database connection timed out',
    })
  },
}
