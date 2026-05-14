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

type SettingsResponse = {
  lastSyncAt?: string | null
  setupUrl?: string | null
}

const DEFAULT_SETUP_URL = 'https://riposte.sh/setup'

export default function AppSettings({ environment, userContext }: ExtensionContextValue) {
  const [lastSyncAt, setLastSyncAt] = React.useState<string | null>(null)
  const [setupUrl, setSetupUrl] = React.useState(DEFAULT_SETUP_URL)
  const [status, setStatus] = React.useState<RequestStatus>('idle')

  const apiBase = getApiBase(environment.constants?.API_BASE)
  const userId = userContext.id
  const accountId = userContext.account.id
  const livemode = environment.mode === 'live'

  React.useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      setStatus('loading')
      try {
        const response = await signedStripeAppRequest(
          `${apiBase}/api/stripe/app/settings`,
          userId,
          accountId,
          livemode,
        )

        if (!response.ok) throw new Error(`Settings request failed: ${response.status}`)

        const settings = (await response.json()) as SettingsResponse
        if (cancelled) return

        setLastSyncAt(settings.lastSyncAt ?? null)
        setSetupUrl(settings.setupUrl ?? DEFAULT_SETUP_URL)
        setStatus('idle')
      } catch (error) {
        if (cancelled) return
        console.error(error)
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
      const response = await signedStripeAppRequest(
        `${apiBase}/api/stripe/app/sync`,
        userId,
        accountId,
        livemode,
      )

      if (!response.ok) throw new Error(`Sync request failed: ${response.status}`)

      setStatus('started')
    } catch (error) {
      console.error(error)
      setStatus('error')
    }
  }

  return (
    <SettingsView>
      <Box css={{ stack: 'y', gap: 'large', padding: 'medium', maxWidth: 720, width: 'fill' }}>
        {status === 'error' && (
          <Banner
            type="critical"
            title="Riposte could not reach the backend"
            description="Try again, or open Riposte setup to finish configuration"
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

async function signedStripeAppRequest(
  url: string,
  userId: string | undefined,
  accountId: string,
  livemode: boolean,
): Promise<Response> {
  if (!userId) throw new Error('Missing Stripe user context')

  const payload = { livemode }
  return fetch(url, {
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
