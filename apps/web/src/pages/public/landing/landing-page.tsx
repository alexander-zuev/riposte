import { ArrowRightIcon, CaretRightIcon, CheckIcon } from '@phosphor-icons/react'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { joinWaitlist, joinWaitlistInput } from '@web/server/entrypoints/functions/waitlist.fn'
import { Button } from '@web/ui/components/ui/button'
import { FieldError } from '@web/ui/components/ui/field'
import { Input } from '@web/ui/components/ui/input'
import { Logo } from '@web/ui/components/ui/logo'
import { useRef } from 'react'

const STEPS = [
  {
    number: '01',
    title: 'detect',
    bullets: ['Stripe webhook fires', 'dispute type classified', 'deadline tracked'],
  },
  {
    number: '02',
    title: 'investigate',
    bullets: ['order data pulled', 'customer history checked', 'shipping proof located'],
  },
  {
    number: '03',
    title: 'build',
    bullets: ['evidence matched to reason', 'documents assembled', 'response drafted'],
  },
  {
    number: '04',
    title: 'submit',
    bullets: ['sent to Stripe API', 'under 60 seconds', 'no manual work'],
  },
  {
    number: '05',
    title: 'learn',
    bullets: ['outcome tracked', 'win rate measured', 'strategy refined'],
  },
] as const

export function LandingPage() {
  const emailRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex h-dvh flex-col bg-background p-4 md:p-8">
      <div className="relative flex flex-1 flex-col p-6 md:p-10">
        <CornerBrackets />

        <header className="relative z-10 flex items-center justify-between px-4 py-4 md:px-6">
          <Logo variant="full" size="md" href="/" />
          <Button
            variant="secondary"
            size="lg"
            onClick={() => emailRef.current?.focus({ preventScroll: false })}
            className="text-sm"
          >
            Sign up
          </Button>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
          <div className="flex flex-col items-center">
            <h1 className="text-display-hero max-w-3xl text-center">
              Fight and win Stripe chargebacks,
              <span className="text-accent"> on autopilot</span>
            </h1>

            <p className="text-subtitle mt-6 max-w-xl text-center text-muted-foreground">
              Riposte is an AI agent that investigates disputes, builds evidence packets, and
              submits winning responses to Stripe — before the deadline runs out.
            </p>
          </div>

          <section className="w-full max-w-7xl">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-5 md:gap-2">
              {STEPS.map((step, i) => (
                <div
                  key={step.number}
                  className="relative flex flex-col rounded-md border border-border p-6"
                >
                  <span className="font-brand text-3xl text-foreground">{step.number}</span>
                  <h4 className="mt-3">{step.title}</h4>
                  <ul className="mt-3 flex flex-1 flex-col gap-1">
                    {step.bullets.map((b) => (
                      <li key={b} className="flex items-baseline gap-2 text-muted-foreground">
                        <span className="shrink-0 text-accent">·</span>
                        <span className="text-sm">{b}</span>
                      </li>
                    ))}
                  </ul>
                  {i < STEPS.length - 1 && (
                    <CaretRightIcon
                      size={20}
                      weight="fill"
                      className="absolute top-1/2 left-[calc(100%-5px)] z-10 hidden -translate-y-1/2 text-accent md:block"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">Get early access — join the waitlist</p>
            <WaitlistForm emailRef={emailRef} />
          </div>
        </main>
      </div>
    </div>
  )
}

function WaitlistForm({ emailRef }: { emailRef: React.RefObject<HTMLInputElement | null> }) {
  const mutation = useMutation({
    mutationFn: (data: { email: string }) => joinWaitlist({ data }),
  })

  const form = useForm({
    defaultValues: { email: '' },
    validators: { onBlur: joinWaitlistInput, onSubmit: joinWaitlistInput },
    onSubmit: ({ value }) => mutation.mutate(value),
  })

  if (mutation.isSuccess) {
    return (
      <div className="flex items-center gap-2 text-success-muted-foreground">
        <CheckIcon size={18} />
        <span className="font-medium">You're on the list. We'll notify you when we launch.</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        noValidate
        className="flex flex-col items-center gap-2"
      >
        <div className="flex items-center gap-3">
          <form.Field name="email">
            {(field) => (
              <Input
                id={field.name}
                name={field.name}
                type="email"
                placeholder="Enter your email"
                className="h-9 w-72 text-sm"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                ref={emailRef}
              />
            )}
          </form.Field>
          <Button
            variant="default"
            size="lg"
            type="submit"
            disabled={mutation.isPending}
            className="text-sm"
          >
            Join Waitlist
            <ArrowRightIcon size={18} />
          </Button>
        </div>
        <div className="h-5 w-full">
          <form.Subscribe selector={(state) => state.fieldMeta.email}>
            {(meta) => {
              if (mutation.isError)
                return (
                  <p className="text-left text-sm text-destructive">
                    Something went wrong. Try again.
                  </p>
                )
              if (!meta?.isTouched || meta.isValid) return null
              return <FieldError className="text-left" errors={meta.errors} />
            }}
          </form.Subscribe>
        </div>
      </form>
    </div>
  )
}

const bracketClass = 'pointer-events-none absolute h-16 w-16 text-foreground md:h-24 md:w-24'

function CornerBrackets() {
  return (
    <>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${bracketClass} top-0 left-0`}
        aria-hidden="true"
      >
        <path d="M2 8V2h6" stroke="currentColor" strokeWidth="0.75" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${bracketClass} top-0 right-0`}
        aria-hidden="true"
      >
        <path d="M22 8V2h-6" stroke="currentColor" strokeWidth="0.75" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${bracketClass} bottom-0 left-0`}
        aria-hidden="true"
      >
        <path d="M2 16v6h6" stroke="currentColor" strokeWidth="0.75" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${bracketClass} right-0 bottom-0`}
        aria-hidden="true"
      >
        <path d="M22 16v6h-6" stroke="currentColor" strokeWidth="0.75" />
      </svg>
    </>
  )
}
