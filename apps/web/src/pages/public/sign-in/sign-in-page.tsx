import { Turnstile } from '@marsidev/react-turnstile'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import {
  authService,
  type AuthServiceError,
  type AuthServiceValue,
  useLastLoginMethod,
} from '@web/lib/auth'
import { settings } from '@web/lib/env/env'
import { Badge } from '@web/ui/components/ui/badge'
import { Button } from '@web/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/ui/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@web/ui/components/ui/field'
import { Input } from '@web/ui/components/ui/input'
import { Logo } from '@web/ui/components/ui/logo'
import { useCallback, useState } from 'react'
import { FaGithub } from 'react-icons/fa'
import { FcGoogle } from 'react-icons/fc'
import { toast } from 'sonner'
import { z } from 'zod'

type OAuthProvider = 'github' | 'google'
type OAuthSignInInput = { provider: OAuthProvider }
type MagicLinkInput = { email: string }

const emailSignInSchema = z.object({
  email: z.email('Enter a valid email'),
})

const turnstileOptions = {
  action: 'sign-in',
  size: 'normal',
  theme: 'light',
  refreshExpired: 'auto',
} as const

function isEmailLoginMethod(method: string | null) {
  return method === 'magic-link'
}

export function SignInPage() {
  const auth = authService()
  const { redirectTo } = useSearch({ from: '/_public/sign-in' })
  const lastLoginMethod = useLastLoginMethod()
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileError, setTurnstileError] = useState<string | null>(null)
  const [authLocked, setAuthLocked] = useState(false)

  const resetTurnstile = useCallback((message?: string) => {
    setTurnstileToken(null)
    setTurnstileError(message ?? null)
  }, [])

  const oauthMutation = useMutation<AuthServiceValue, AuthServiceError, OAuthSignInInput>({
    mutationFn: async (input: OAuthSignInInput) => {
      const result = await auth.signInWithOAuth(input.provider, {
        redirectTo,
      })
      if (result.isErr()) throw result.error
      return result.value
    },
    onMutate: () => setAuthLocked(true),
    onError: (error) => {
      setAuthLocked(false)
      toast.error(error.message ?? 'Sign-in failed. Please try again')
    },
  })

  const emailMutation = useMutation<AuthServiceValue, AuthServiceError, MagicLinkInput>({
    mutationFn: async (input: MagicLinkInput) => {
      const result = await auth.signInWithMagicLink(input.email, {
        captchaToken: turnstileToken ?? undefined,
        redirectTo,
      })

      if (result.isErr()) throw result.error
      return result.value
    },
    onMutate: () => setAuthLocked(true),
    onSuccess: (result, input) => {
      setAuthLocked(false)
      toast.info(result.message ?? `Check your email for a sign-in link to ${input.email}`)
      resetTurnstile()
    },
    onError: (error) => {
      setAuthLocked(false)
      toast.error(error.message ?? 'Failed to send sign-in link. Please try again')
    },
  })

  const form = useForm({
    defaultValues: { email: '' },
    validators: {
      onSubmit: emailSignInSchema,
    },
    onSubmit: ({ value }) => emailMutation.mutate(value),
  })

  const isAuthDisabled = authLocked || oauthMutation.isPending || emailMutation.isPending
  const canSubmitOAuth = !isAuthDisabled
  const canSubmitEmail = !isAuthDisabled && !!turnstileToken

  const handleOAuth = useCallback(
    (provider: OAuthProvider) => {
      oauthMutation.mutate({ provider })
    },
    [oauthMutation],
  )

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token)
    setTurnstileError(null)
  }, [])

  const handleTurnstileExpire = useCallback(() => {
    resetTurnstile()
  }, [resetTurnstile])

  const handleTurnstileFailure = useCallback(() => {
    resetTurnstile('Verification failed. Reload the page and try again')
  }, [resetTurnstile])

  const handleTurnstileUnsupported = useCallback(() => {
    resetTurnstile('Verification is not supported in this browser')
  }, [resetTurnstile])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex justify-center">
          <Logo variant="full" size="lg" href="/" />
        </div>

        <Card className="rounded-lg shadow-md">
          <CardHeader>
            <CardTitle className="flex justify-center">Sign in</CardTitle>
            <CardDescription className="flex justify-center">
              Continue with a provider or get a sign-in link
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Button
                variant="secondary"
                size="lg"
                className="relative w-full rounded-md"
                disabled={!canSubmitOAuth}
                onClick={() => handleOAuth('github')}
              >
                <FaGithub className="size-4" aria-hidden="true" />
                GitHub
                {lastLoginMethod === 'github' ? (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-1 animate-in duration-200 fade-in-0"
                  >
                    Last used
                  </Badge>
                ) : null}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="relative w-full rounded-md"
                disabled={!canSubmitOAuth}
                onClick={() => handleOAuth('google')}
              >
                <FcGoogle className="size-4" aria-hidden="true" />
                Google
                {lastLoginMethod === 'google' ? (
                  <Badge
                    variant="secondary"
                    className="absolute -top-2 -right-1 animate-in duration-200 fade-in-0"
                  >
                    Last used
                  </Badge>
                ) : null}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-2 text-xs text-muted-foreground">or</span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
              noValidate
              className="flex flex-col gap-4"
            >
              <FieldGroup className="gap-3">
                <form.Field name="email">
                  {(field) => (
                    <Field
                      className="gap-1.5"
                      data-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                    >
                      <div className="flex min-h-5 items-center justify-between gap-2">
                        <FieldLabel htmlFor={field.name} className="font-medium">
                          Email
                        </FieldLabel>
                        {isEmailLoginMethod(lastLoginMethod) ? (
                          <Badge variant="secondary" className="animate-in duration-200 fade-in-0">
                            Last used
                          </Badge>
                        ) : null}
                      </div>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        autoComplete="email"
                        placeholder="Email"
                        className="rounded-md"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        disabled={isAuthDisabled}
                        aria-invalid={field.state.meta.isTouched && !field.state.meta.isValid}
                      />
                      <div className="h-4">
                        {field.state.meta.isTouched && !field.state.meta.isValid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </div>
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>

              <Button
                type="submit"
                size="lg"
                className="w-full rounded-md"
                disabled={!canSubmitEmail}
              >
                Send sign-in link
              </Button>
            </form>
          </CardContent>
        </Card>

        <small className="text-center text-muted-foreground">
          By continuing, you agree to Riposte&apos;s <a href="/terms">terms</a> and{' '}
          <a href="/privacy" className="font-medium">
            privacy policy
          </a>
        </small>

        <div className="flex flex-col items-center gap-2">
          <Turnstile
            siteKey={settings.turnstile.siteKey}
            options={turnstileOptions}
            onSuccess={handleTurnstileSuccess}
            onExpire={handleTurnstileExpire}
            onError={handleTurnstileFailure}
            onTimeout={handleTurnstileFailure}
            onUnsupported={handleTurnstileUnsupported}
          />

          <div className="min-h-4 text-center">
            {turnstileError ? <FieldError>{turnstileError}</FieldError> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
