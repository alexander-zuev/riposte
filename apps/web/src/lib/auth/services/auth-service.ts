import { createLogger } from '@riposte/core/client'
import { authClient } from '@web/lib/clients/auth-client'
import { Sentry } from '@web/lib/clients/sentry-client'
import posthog from 'posthog-js'

const logger = createLogger('auth-service')

export function authService() {
  const buildFetchOptions = (captchaToken?: string) => {
    return captchaToken ? { headers: { 'x-captcha-response': captchaToken } } : undefined
  }

  const signInWithOAuth = async (
    provider: 'google' | 'github',
    options?: { redirectTo?: string },
  ) => {
    const redirectTo = options?.redirectTo ?? '/dashboard'

    try {
      await authClient.signIn.social({ provider, callbackURL: redirectTo })
      logger.info('oauth_sign_in_initiated', { provider })
      return { success: true }
    } catch (error) {
      logger.error('oauth_sign_in_failed', { provider, error })
      return { success: false, message: 'Sign-in failed. Please try again.' }
    }
  }

  const signInWithEmail = async (
    email: string,
    password: string,
    options?: { redirectTo?: string; captchaToken?: string },
  ) => {
    const redirectTo = options?.redirectTo ?? '/dashboard'

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: redirectTo,
        fetchOptions: buildFetchOptions(options?.captchaToken),
      })

      if (error) throw error

      logger.info('email_sign_in')
      return { success: true }
    } catch (error) {
      logger.error('email_sign_in_failed', { error })
      return { success: false, message: 'Invalid email or password.' }
    }
  }

  const signUpWithEmail = async (
    email: string,
    password: string,
    name: string,
    options?: { redirectTo?: string; captchaToken?: string },
  ) => {
    const redirectTo = options?.redirectTo ?? '/dashboard'

    try {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: redirectTo,
        fetchOptions: buildFetchOptions(options?.captchaToken),
      })

      if (error) throw error

      logger.info('email_sign_up')
      return { success: true }
    } catch (error) {
      logger.error('email_sign_up_failed', { error })
      return { success: false, message: 'Sign-up failed. Please try again.' }
    }
  }

  const signOut = async () => {
    try {
      await authClient.signOut()
      Sentry.setUser(null)
      posthog.reset()
      logger.info('signed_out')
      return { success: true }
    } catch (error) {
      logger.error('sign_out_failed', { error })
      return { success: false, message: 'Sign out failed. Please try again.' }
    }
  }

  return { signInWithOAuth, signInWithEmail, signUpWithEmail, signOut }
}
