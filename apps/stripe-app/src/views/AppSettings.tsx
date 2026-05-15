import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context'
import {
  Badge,
  Banner,
  Box,
  Button,
  Link,
  PropertyList,
  PropertyListItem,
  SettingsView,
} from '@stripe/ui-extension-sdk/ui'
import { fetchStripeSignature } from '@stripe/ui-extension-sdk/utils'
import React from 'react'

type RequestStatus = 'idle' | 'loading' | 'syncing' | 'started' | 'error'
type RequestErrorKind = 'network' | 'auth' | 'server' | 'unknown'

type SettingsResponse = {
  lastSyncAt?: string | null
}

export default function AppSettings({ environment, userContext }: ExtensionContextValue) {
  const [lastSyncAt, setLastSyncAt] = React.useState<string | null>(null)
  const [status, setStatus] = React.useState<RequestStatus>('idle')
  const [errorKind, setErrorKind] = React.useState<RequestErrorKind>('unknown')

  // TODO: Before publishing the production version, set API_BASE and post_install_action.url
  // in stripe-app.json back to https://riposte.sh.
  const apiBase = getApiBase(environment.constants?.API_BASE)
  const setupUrl = `${apiBase}/setup`
  const userId = userContext.id
  const accountId = userContext.account.id
  const livemode = environment.mode === 'live'

  React.useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      setStatus('loading')
      try {
        const response = await signedStripeAppRequest({
          url: `${apiBase}/api/stripe/app/settings`,
          userId,
          accountId,
          livemode,
        })
        const settings = (await response.json()) as SettingsResponse
        if (cancelled) return

        setLastSyncAt(settings.lastSyncAt ?? null)
        setStatus('idle')
      } catch (error) {
        if (cancelled) return
        setErrorKind(classifyRequestError(error))
        setStatus('error')
      }
    }

    loadSettings()

    return () => {
      cancelled = true
    }
  }, [accountId, apiBase, livemode, userId])

  async function startSync() {
    setStatus('syncing')
    try {
      await signedStripeAppRequest({
        url: `${apiBase}/api/stripe/app/sync`,
        userId,
        accountId,
        livemode,
      })

      setStatus('started')
    } catch (error) {
      setErrorKind(classifyRequestError(error))
      setStatus('error')
    }
  }

  return (
    <SettingsView>
      <Box css={{ stack: 'y', gap: 'large', padding: 'medium', maxWidth: 720, width: 'fill' }}>
        {status === 'error' && (
          <Banner
            type="critical"
            title={getErrorTitle(errorKind)}
            description={getErrorDescription(errorKind)}
          />
        )}

        <Box css={{ stack: 'y', gap: 'small', width: 'fill' }}>
          <Box css={{ stack: 'x', gap: 'small', alignY: 'center' }}>
            <Box css={{ font: 'heading' }}>Dispute sync</Box>
            {status === 'started' && <Badge type="info">Queued</Badge>}
          </Box>
          <Box css={{ font: 'body', color: 'secondary' }}>
            {status === 'started'
              ? 'Import requested. Open Riposte to review setup and disputes'
              : 'Import recent Stripe disputes so Riposte can create or update local cases'}
          </Box>
          <PropertyList>
            <PropertyListItem
              label="Last sync"
              value={status === 'loading' ? 'Loading...' : formatLastSync(lastSyncAt)}
            />
          </PropertyList>
        </Box>

        <Box
          css={{
            stack: 'y',
            gap: 'medium',
            width: 'fill',
            padding: 'medium',
            backgroundColor: 'container',
            borderRadius: 'small',
          }}
        >
          <Button
            type="primary"
            pending={status === 'syncing'}
            disabled={status === 'loading'}
            onPress={startSync}
          >
            Sync disputes
          </Button>
        </Box>

        <Box css={{ stack: 'y', gap: 'small', width: 'fill' }}>
          <Box css={{ font: 'heading' }}>Setup checklist</Box>
          <Box css={{ font: 'body', color: 'secondary' }}>
            Connect app data, define evidence rules, and approve how Riposte handles live disputes
          </Box>
          <Link href={setupUrl} external target="_blank">
            {status === 'started' ? 'Open Riposte' : 'Open setup checklist'}
          </Link>
        </Box>
      </Box>
    </SettingsView>
  )
}

async function signedStripeAppRequest(args: {
  accountId: string
  livemode: boolean
  url: string
  userId: string | undefined
}): Promise<Response> {
  const { accountId, livemode, url, userId } = args
  if (!userId) throw new Error('Missing Stripe user context')

  const payload = { livemode }
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': await fetchStripeSignature(payload),
      },
      body: JSON.stringify({
        ...payload,
        user_id: userId,
        account_id: accountId,
      }),
    })
  } catch (error) {
    console.error('stripe_app_request_network_failed', {
      error,
      hint: 'Check backend URL, CORS, CSP, tunnel availability, and network reachability',
      url,
    })
    throw new StripeAppRequestError('network')
  }

  if (!response.ok) {
    const body = await readResponseBody(response)
    console.error('stripe_app_request_failed', {
      body,
      errorKind: classifyStatus(response.status),
      hint: 'Check backend logs, Stripe App signing secret, installed app version, and API route response',
      status: response.status,
      statusText: response.statusText,
      url,
    })
    throw new StripeAppRequestError(classifyStatus(response.status))
  }

  return response
}

function getApiBase(value: unknown): string {
  if (typeof value === 'string' && value.length > 0) return value
  return 'https://riposte.sh'
}

function formatLastSync(value: string | null): string {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

async function readResponseBody(response: Response): Promise<string | undefined> {
  try {
    return await response.clone().text()
  } catch {
    return undefined
  }
}

function classifyStatus(status: number): RequestErrorKind {
  if (status === 401 || status === 403) return 'auth'
  if (status >= 500) return 'server'
  return 'unknown'
}

function classifyRequestError(error: unknown): RequestErrorKind {
  if (error instanceof StripeAppRequestError) return error.kind
  console.error('stripe_app_request_unexpected_error', { error })
  return 'unknown'
}

function getErrorTitle(kind: RequestErrorKind): string {
  switch (kind) {
    case 'network':
      return 'Riposte could not be reached'
    case 'auth':
      return 'Riposte rejected the Stripe App request'
    case 'server':
      return 'Riposte hit a backend error'
    case 'unknown':
      return 'Riposte could not complete the request'
  }
}

function getErrorDescription(kind: RequestErrorKind): string {
  switch (kind) {
    case 'network':
      return 'Try again, or open Riposte setup'
    case 'auth':
      return 'Try reinstalling the app, or open Riposte setup'
    case 'server':
      return 'Open Riposte setup, then try again'
    case 'unknown':
      return 'Try again, or open Riposte setup to finish configuration'
  }
}

class StripeAppRequestError extends Error {
  constructor(readonly kind: RequestErrorKind) {
    super(`Stripe App request failed: ${kind}`)
  }
}
