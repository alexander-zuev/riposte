import { CopyIcon, ThumbsUpIcon } from '@phosphor-icons/react'
import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { CodeBlock } from '@web/ui/components/ai-elements/code-block'
import {
  Conversation,
  ConversationContent,
  ConversationDownload,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@web/ui/components/ai-elements/conversation'
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
  MessageToolbar,
} from '@web/ui/components/ai-elements/message'
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from '@web/ui/components/ai-elements/prompt-input'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@web/ui/components/ai-elements/tool'
import { Card, CardContent, CardFooter } from '@web/ui/components/ui/card'
import type { DynamicToolUIPart, TextUIPart, UIMessage } from 'ai'

const meta: Meta = {
  title: 'Components/AI Elements',
  parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj

const t = (text: string): TextUIPart => ({ type: 'text', text, state: 'done' })

type ToolFixture = {
  toolName: string
  toolCallId: string
} & (
  | { state: 'input-streaming'; input?: Record<string, unknown> }
  | { state: 'input-available'; input: Record<string, unknown> }
  | {
      state: 'output-available'
      input: Record<string, unknown>
      output: unknown
    }
  | { state: 'output-error'; input: Record<string, unknown>; errorText: string }
)

const tool = (f: ToolFixture): DynamicToolUIPart => {
  const base = {
    type: 'dynamic-tool' as const,
    toolCallId: f.toolCallId,
    toolName: f.toolName,
  }
  switch (f.state) {
    case 'input-streaming':
      return { ...base, state: 'input-streaming', input: f.input }
    case 'input-available':
      return { ...base, state: 'input-available', input: f.input }
    case 'output-available':
      return { ...base, state: 'output-available', input: f.input, output: f.output }
    case 'output-error':
      return {
        ...base,
        state: 'output-error',
        input: f.input,
        errorText: f.errorText,
      }
    default:
      throw new Error(`unreachable tool fixture state`)
  }
}

const productName = 'Typist'

const welcomeText = `Hey — I'm the Riposte agent for **${productName}**. I'll handle Stripe disputes for you end to end.

To get started, I need to:

1. Connect your Stripe account
2. Connect your app database (we support Neon and Supabase via OAuth)
3. Run a dry-run against a real recent dispute

[Connect Stripe](#connect-stripe) · [Skip to database](#connect-db)`

const userPickDisputeText = `Use \`du_1TV71GDGi8KWRsUNvG3hzUMF\` — the $222 fraudulent one.`

const agentInvestigatingText = `Pulling the dispute details and matching the customer against your app database.`

const evidenceDraftMarkdown = `Here's the draft \`access_activity_log\` I'd submit to Stripe:

\`\`\`text
2026-04-21 14:32:08 UTC — user signed up (workspaces.id=ws_8x2A1q, plan_status=active)
2026-04-21 14:34:11 UTC — first transcription job started (jobs.id=job_LM4)
2026-04-22 09:12:44 UTC — 14 transcription jobs completed
2026-04-23 18:55:02 UTC — usage report exported to PDF (artifacts.id=art_Pz9)
\`\`\`

And the rebuttal text:

> The cardholder maintained an active subscription from 2026-04-21 through the date of the charge, completing 14 transcription jobs and exporting one usage report. Account activity is consistent with a legitimate customer, not unauthorized use.

Want to commit this playbook as \`v1\` for ${productName}?`

const onboardingMessages: UIMessage[] = [
  {
    id: 'msg_welcome',
    role: 'assistant',
    parts: [t(welcomeText)],
  },
  {
    id: 'msg_user_setup',
    role: 'user',
    parts: [t(`Let's set up ${productName}. Stripe is already connected.`)],
  },
  {
    id: 'msg_agent_list_disputes',
    role: 'assistant',
    parts: [
      t(`Great. Stripe is connected. Let me find a recent dispute to dry-run against.`),
      tool({
        toolName: 'list_recent_disputes',
        toolCallId: 'call_disputes_01',
        state: 'output-available',
        input: { limit: 5, reasons: ['fraudulent', 'subscription_canceled'] },
        output: {
          disputes: [
            {
              id: 'du_1TV71GDGi8KWRsUNvG3hzUMF',
              amount: 222,
              currency: 'usd',
              reason: 'fraudulent',
              created: '2026-05-09T10:17:00Z',
            },
            {
              id: 'du_ready_review_001',
              amount: 9900,
              currency: 'usd',
              reason: 'subscription_canceled',
              created: '2026-05-08T14:32:00Z',
            },
          ],
        },
      }),
      t(
        `I found 2 disputes in supported reasons. Pick one to dry-run, or I can synthesize one from your latest successful charge.`,
      ),
    ],
  },
  {
    id: 'msg_user_pick',
    role: 'user',
    parts: [t(userPickDisputeText)],
  },
  {
    id: 'msg_agent_investigate',
    role: 'assistant',
    parts: [
      t(agentInvestigatingText),
      tool({
        toolName: 'list_tables',
        toolCallId: 'call_tables_01',
        state: 'output-available',
        input: { schema: 'public' },
        output: {
          tables: ['workspaces', 'users', 'subscriptions', 'jobs', 'artifacts', 'webhook_events'],
        },
      }),
      tool({
        toolName: 'query_db',
        toolCallId: 'call_query_01',
        state: 'output-available',
        input: {
          sql: "SELECT id, owner_email, plan_status, created_at FROM workspaces WHERE stripe_customer_id = 'cus_PqZxK9aB' LIMIT 1",
        },
        output: {
          rows: [
            {
              id: 'ws_8x2A1q',
              owner_email: 'mara@acme.test',
              plan_status: 'active',
              created_at: '2026-04-21T14:32:08Z',
            },
          ],
          rowCount: 1,
        },
      }),
      tool({
        toolName: 'query_db',
        toolCallId: 'call_query_02',
        state: 'output-available',
        input: {
          sql: "SELECT COUNT(*) AS n, MIN(created_at) AS first, MAX(created_at) AS last FROM jobs WHERE workspace_id = 'ws_8x2A1q' AND status = 'completed'",
        },
        output: {
          rows: [
            {
              n: 14,
              first: '2026-04-21T14:34:11Z',
              last: '2026-04-22T09:12:44Z',
            },
          ],
          rowCount: 1,
        },
      }),
      tool({
        toolName: 'fetch_artifact',
        toolCallId: 'call_artifact_01',
        state: 'output-error',
        input: { artifact_id: 'art_Pz9', kind: 'usage_report_pdf' },
        errorText:
          'HTTP 404 — artifact URL returned Not Found. The agent will continue without this artifact and flag it as a missing input on the packet.',
      }),
      t(evidenceDraftMarkdown),
    ],
  },
]

const reasoningHeavyConversation: UIMessage[] = [
  {
    id: 'msg_a',
    role: 'user',
    parts: [
      t(
        `Why did you pick \`workspaces.created_at\` instead of \`subscriptions.start_date\` for the service-start timestamp?`,
      ),
    ],
  },
  {
    id: 'msg_b',
    role: 'assistant',
    parts: [
      t(`Your product type is \`digital_product_or_service\` with the \`access_granted\` rule. The playbook says service starts when the workspace row is created with \`plan_status = 'active'\`, not when the Stripe subscription begins (subscriptions can be created without a workspace, and Stripe sometimes back-dates \`start_date\` after trials).

Concretely, on this dispute:

- \`subscriptions.start_date\` = 2026-04-21T00:00:00Z (start of UTC day, no time component)
- \`workspaces.created_at\` = 2026-04-21T14:32:08Z (precise to the second)

The second one survives a "they signed up at the same time they were charged" rebuttal. The first one doesn't.`),
    ],
  },
]

function ChatShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto h-screen max-w-3xl bg-background p-6">
      <Card className="flex h-full flex-col gap-0 py-0">
        <CardContent className="flex flex-1 overflow-hidden p-0">{children}</CardContent>
        <CardFooter className="p-0">
          <PromptInput
            className="w-full border-0"
            onSubmit={() => {
              /* storybook stub */
            }}
          >
            <PromptInputBody>
              <PromptInputTextarea placeholder="Ask the agent — or click the action above to continue" />
              <PromptInputFooter>
                <PromptInputSubmit status="ready" />
              </PromptInputFooter>
            </PromptInputBody>
          </PromptInput>
        </CardFooter>
      </Card>
    </div>
  )
}

function MessagePart({
  messageId,
  part,
  index,
}: {
  messageId: string
  part: UIMessage['parts'][number]
  index: number
}) {
  const key = `${messageId}-${index}`

  if (part.type === 'text') {
    return <MessageResponse key={key}>{part.text}</MessageResponse>
  }

  if (part.type === 'dynamic-tool') {
    return (
      <Tool key={key} defaultOpen={part.state === 'output-error'}>
        <ToolHeader type="dynamic-tool" state={part.state} toolName={part.toolName} />
        <ToolContent>
          {part.state !== 'input-streaming' && <ToolInput input={part.input} />}
          {part.state === 'output-available' && (
            <ToolOutput output={part.output} errorText={undefined} />
          )}
          {part.state === 'output-error' && (
            <ToolOutput output={undefined} errorText={part.errorText} />
          )}
        </ToolContent>
      </Tool>
    )
  }

  return null
}

function renderMessages(messages: UIMessage[]) {
  return messages.map((message) => (
    <Message key={message.id} from={message.role}>
      <MessageContent>
        {message.parts.map((part, index) => (
          <MessagePart
            key={`${message.id}-${index}`}
            messageId={message.id}
            part={part}
            index={index}
          />
        ))}
        {message.role === 'assistant' && (
          <MessageToolbar>
            <MessageActions>
              <MessageAction tooltip="Copy">
                <CopyIcon className="size-4" />
              </MessageAction>
              <MessageAction tooltip="Helpful">
                <ThumbsUpIcon className="size-4" />
              </MessageAction>
            </MessageActions>
          </MessageToolbar>
        )}
      </MessageContent>
    </Message>
  ))
}

export const FullOnboarding: Story = {
  name: 'Full Onboarding (everything)',
  render: () => (
    <ChatShell>
      <Conversation className="flex-1">
        <ConversationContent>{renderMessages(onboardingMessages)}</ConversationContent>
        <ConversationDownload messages={onboardingMessages} />
        <ConversationScrollButton />
      </Conversation>
    </ChatShell>
  ),
}

export const EmptyState: Story = {
  name: 'Empty State',
  render: () => (
    <ChatShell>
      <Conversation className="flex-1">
        <ConversationContent>
          <ConversationEmptyState
            title="No messages yet"
            description="Connect your Stripe account to begin the onboarding dry-run"
          />
        </ConversationContent>
      </Conversation>
    </ChatShell>
  ),
}

export const TextOnly: Story = {
  name: 'Text-only Conversation',
  render: () => (
    <ChatShell>
      <Conversation className="flex-1">
        <ConversationContent>{renderMessages(reasoningHeavyConversation)}</ConversationContent>
      </Conversation>
    </ChatShell>
  ),
}

export const ToolCallStates: Story = {
  name: 'Tool Call — every state',
  render: () => (
    <ChatShell>
      <Conversation className="flex-1">
        <ConversationContent>
          <Message from="assistant">
            <MessageContent>
              <Tool>
                <ToolHeader type="dynamic-tool" state="input-streaming" toolName="list_tables" />
                <ToolContent>
                  <ToolInput input={undefined} />
                </ToolContent>
              </Tool>
              <Tool>
                <ToolHeader type="dynamic-tool" state="input-available" toolName="query_db" />
                <ToolContent>
                  <ToolInput
                    input={{
                      sql: "SELECT * FROM workspaces WHERE id = 'ws_8x2A1q'",
                    }}
                  />
                </ToolContent>
              </Tool>
              <Tool defaultOpen>
                <ToolHeader type="dynamic-tool" state="output-available" toolName="query_db" />
                <ToolContent>
                  <ToolInput
                    input={{
                      sql: "SELECT id, plan_status FROM workspaces WHERE stripe_customer_id = 'cus_PqZxK9aB'",
                    }}
                  />
                  <ToolOutput
                    output={{
                      rows: [{ id: 'ws_8x2A1q', plan_status: 'active' }],
                      rowCount: 1,
                    }}
                    errorText={undefined}
                  />
                </ToolContent>
              </Tool>
              <Tool defaultOpen>
                <ToolHeader type="dynamic-tool" state="output-error" toolName="fetch_artifact" />
                <ToolContent>
                  <ToolInput input={{ artifact_id: 'art_Pz9' }} />
                  <ToolOutput
                    output={undefined}
                    errorText="HTTP 404 — artifact URL returned Not Found"
                  />
                </ToolContent>
              </Tool>
            </MessageContent>
          </Message>
        </ConversationContent>
      </Conversation>
    </ChatShell>
  ),
}

export const StandaloneCodeBlock: Story = {
  name: 'CodeBlock (standalone)',
  render: () => (
    <div className="mx-auto max-w-3xl p-6">
      <CodeBlock
        code={`SELECT id, owner_email, plan_status, created_at
FROM workspaces
WHERE stripe_customer_id = 'cus_PqZxK9aB'
LIMIT 1;`}
        language="sql"
      />
    </div>
  ),
}
