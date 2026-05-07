import { createLogger } from '@riposte/core/client'
import { authClient } from '@web/lib/clients/auth-client'
import { Sentry } from '@web/lib/clients/sentry-client'
import { Result } from 'better-result'
import { posthog } from 'posthog-js'

const logger = createLogger('auth-service')
const DEFAULT_AUTH_REDIRECT = '/dashboard'

export type AuthServiceValue = { message?: string }
export type AuthServiceError = {
  status: number
  statusText: string
  code?: string
  message?: string
}
export type AuthServiceResult = Result<AuthServiceValue, AuthServiceError>

function buildFetchOptions(captchaToken?: string) {
  return captchaToken ? { headers: { 'x-captcha-response': captchaToken } } : undefined
}

export function authService() {
  const signInWithOAuth = async (
    provider: 'google' | 'github',
    options: { redirectTo?: string; captchaToken: string },
  ): Promise<AuthServiceResult> => {
    const redirectTo = options?.redirectTo ?? DEFAULT_AUTH_REDIRECT

    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: redirectTo,
      fetchOptions: buildFetchOptions(options?.captchaToken),
    })

    if (error) {
      logger.error('oauth_sign_in_failed', { provider, error })
      return Result.err(error)
    }

    logger.info('oauth_sign_in_initiated', { provider })
    return Result.ok({})
  }

  const signInWithMagicLink = async (
    email: string,
    options?: { redirectTo?: string; captchaToken?: string },
  ): Promise<AuthServiceResult> => {
    const redirectTo = options?.redirectTo ?? DEFAULT_AUTH_REDIRECT

    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: redirectTo,
      fetchOptions: buildFetchOptions(options?.captchaToken),
    })

    if (error) {
      logger.error('magic_link_failed', { error })
      return Result.err(error)
    }

    logger.info('magic_link_sent')
    return Result.ok({ message: 'Check your email for the sign-in link' })
  }

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string,
    options?: { redirectTo?: string; captchaToken?: string },
  ): Promise<AuthServiceResult> => {
    const redirectTo = options?.redirectTo ?? DEFAULT_AUTH_REDIRECT

    const { error } = await authClient.signUp.email({
      email,
      password,
      name,
      callbackURL: redirectTo,
      fetchOptions: buildFetchOptions(options?.captchaToken),
    })

    if (error) {
      logger.error('email_sign_up_failed', { error })
      return Result.err(error)
    }

    logger.info('email_sign_up')
    return Result.ok({})
  }

  const signOut = async (): Promise<AuthServiceResult> => {
    const { error } = await authClient.signOut()
    if (error) {
      logger.error('sign_out_failed', { error })
      return Result.err(error)
    }

    Sentry.setUser(null)
    posthog.reset()
    logger.info('signed_out')
    return Result.ok({})
  }

  return { signInWithOAuth, signInWithMagicLink, signUpWithEmail, signOut }
}
