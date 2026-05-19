import { ArrowRightIcon, SparkleIcon } from '@phosphor-icons/react'
import type { ProductSetupState, ProductSetupStep } from '@riposte/core/client'
import { useForm } from '@tanstack/react-form'
import { Button } from '@web/ui/components/ui/button'
import { Card, CardContent, CardFooter } from '@web/ui/components/ui/card'
import { Textarea } from '@web/ui/components/ui/textarea'
import { type ReactNode, useState } from 'react'

type ChatTurn = {
  id: string
  from: 'agent' | 'user'
  body: ReactNode
}

type OnboardingChatSurfaceProps = {
  productName: string
  state: ProductSetupState
}

/**
 * Onboarding chat shown during setup. Renders the agent's scripted message for
 * the current step plus an inline step action button, followed by any
 * free-form turns the merchant has added. Composer accepts text but for now
 * only echoes a canned "noted, click the action above" reply — real chat
 * arrives when the DisputeAgent SessionManager session is wired.
 *
 * TODO(agent): wire to DisputeAgent DO via SessionManager('onboarding'). Today
 * the script bubble + actions are presentational stubs; advancing the step
 * should dispatch an AdvanceProductSetup command through the message bus.
 */
export function OnboardingChatSurface({ productName, state }: OnboardingChatSurfaceProps) {
  const [turns, setTurns] = useState<ChatTurn[]>([])

  const form = useForm({
    defaultValues: { message: '' },
    onSubmit: ({ value, formApi }) => {
      const text = value.message.trim()
      if (!text) return
      const stamp = Date.now()
      setTurns((prev) => [
        ...prev,
        { id: `u_${stamp}`, from: 'user', body: text },
        {
          id: `a_${stamp}`,
          from: 'agent',
          body: 'Noted — click the action above to continue the script',
        },
      ])
      formApi.reset()
    },
  })

  if (!state.currentStep) return null

  return (
    <Card className="h-[calc(100vh-22rem)] gap-0 py-0">
      <CardContent className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
        <ScriptTurn step={state.currentStep} productName={productName} />
        {turns.map((turn) =>
          turn.from === 'agent' ? (
            <AgentBubble key={turn.id}>{turn.body}</AgentBubble>
          ) : (
            <UserBubble key={turn.id}>{turn.body}</UserBubble>
          ),
        )}
      </CardContent>
      <CardFooter className="p-0">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex w-full items-end gap-2 p-3"
        >
          <form.Field name="message">
            {(field) => (
              <Textarea
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Ask the agent — or click the action above to continue"
                rows={1}
                className="max-h-40 min-h-9 flex-1"
              />
            )}
          </form.Field>
          <Button type="submit" size="sm">
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}

function ScriptTurn({ step, productName }: { step: ProductSetupStep; productName: string }) {
  const handleAdvance = () => {
    // TODO(agent): dispatch AdvanceProductSetup command via the message bus.
    // Backend handler updates productSetupState.currentStep + writes an audit
    // event. The Activity tab picks up the event automatically.
    console.warn('onboarding step advance not yet wired', { step })
  }
  return (
    <div className="flex flex-col gap-3">
      <AgentBubble>{scriptCopy(step, productName)}</AgentBubble>
      <div className="ml-10">
        <Button onClick={handleAdvance} size="sm">
          {ctaLabel(step)}
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}

function AgentBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center bg-muted">
        <SparkleIcon weight="duotone" className="size-4" />
      </div>
      <div className="flex-1 text-sm leading-relaxed">{children}</div>
    </div>
  )
}

function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="ml-10 flex items-start gap-2 text-sm text-muted-foreground">
      <span className="mt-0.5 shrink-0 text-xs">You</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function scriptCopy(step: ProductSetupStep, productName: string): ReactNode {
  switch (step) {
    case 'add_product':
      return (
        <>
          Hi — I'm <strong>Riposte</strong>. I'll defend <strong>{productName}</strong> against
          Stripe disputes. To do that I need access to your Stripe account and to your app's
          customer/activity data. Should we begin?
        </>
      )
    case 'connect_stripe':
      return (
        <>
          First, connect <strong>Stripe</strong>. I'll read your disputes and submit evidence on
          your behalf. I'll never charge or refund without your approval.
        </>
      )
    case 'connect_app_data':
      return (
        <>
          Now show me where your customer activity lives. I need to prove customers received the
          service they paid for — that's the part that wins fraud disputes.
        </>
      )
    case 'playbook':
      return (
        <>
          Time to define the <strong>playbook</strong>. This is what the runtime version of me will
          follow when a real dispute arrives. You can edit any section now or later.
        </>
      )
    case 'dry_run':
      return (
        <>
          Let me practice on a real dispute. I'll match the customer, pull their activity, draft
          evidence text, and assemble a packet. No submission — just so you can review how I think.
        </>
      )
    case 'review':
      return (
        <>
          Last step — review the playbook and approve. Once approved I'll start defending disputes
          automatically as they arrive.
        </>
      )
    default:
      return null
  }
}

function ctaLabel(step: ProductSetupStep): string {
  switch (step) {
    case 'add_product':
      return "Let's start"
    case 'connect_stripe':
      return 'Connect Stripe'
    case 'connect_app_data':
      return 'Connect data source'
    case 'playbook':
      return 'Define playbook'
    case 'dry_run':
      return 'Run dry-run'
    case 'review':
      return 'Approve and finish'
    default:
      return 'Continue'
  }
}
