import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context'
import {
  Banner,
  Box,
  Button,
  Link,
  PropertyList,
  PropertyListItem,
  Select,
  SettingsView,
} from '@stripe/ui-extension-sdk/ui'
import React from 'react'

type Timeline = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_365_days'
type RequestStatus = 'idle' | 'loading' | 'syncing' | 'started' | 'error'

type SettingsResponse = {
  lastSyncAt?: string | null
  setupUrl?: string | null
}

const DEFAULT_SETUP_URL = 'https://riposte.sh/setup'

const timelineLabels: Record<Timeline, string> = {
  last_7_days: 'Last 7 days',
  last_30_days: 'Last 30 days',
  last_90_days: 'Last 90 days',
  last_365_days: 'Last year',
}

export default function AppSettings({ environment, userContext }: ExtensionContextValue) {
  const [timeline, setTimeline] = React.useState<Timeline>('last_30_days')
  const [lastSyncAt, setLastSyncAt] = React.useState<string | null>(null)
  const [setupUrl, setSetupUrl] = React.useState(DEFAULT_SETUP_URL)
  const [status, setStatus] = React.useState<RequestStatus>('idle')

  const apiBase = getApiBase(environment.constants?.API_BASE)
  const accountId = userContext.account.id

  React.useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      setStatus('loading')
      try {
        const response = await fetch(
          `${apiBase}/api/stripe/app/settings?account_id=${encodeURIComponent(accountId)}`,
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
  }, [accountId, apiBase])

  async function startSync() {
    setStatus('syncing')
    try {
      const response = await fetch(`${apiBase}/api/stripe/app/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          timeline,
        }),
      })

      if (!response.ok) throw new Error(`Sync request failed: ${response.status}`)

      setStatus('started')
    } catch (error) {
      console.error(error)
      setStatus('error')
    }
  }

  return (
    <SettingsView statusMessage={getStatusMessage(status)}>
      <Box css={{ stack: 'y', gap: 'large', padding: 'medium', maxWidth: 720, width: 'fill' }}>
        {status === 'error' && (
          <Banner
            type="critical"
            title="Riposte could not reach the backend"
            description="Try again, or open Riposte setup to finish configuration"
          />
        )}

        {status === 'started' && (
          <Banner
            type="default"
            title="Sync started"
            description={`Riposte is syncing ${timelineLabels[timeline].toLowerCase()}`}
          />
        )}

        <Box css={{ stack: 'y', gap: 'small', width: 'fill' }}>
          <Box css={{ font: 'heading' }}>Dispute sync</Box>
          <Box css={{ font: 'body', color: 'secondary' }}>
            Import recent Stripe disputes so Riposte can create or update local cases
          </Box>
          <PropertyList>
            <PropertyListItem label="Last sync" value={formatLastSync(lastSyncAt)} />
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
          <Select
            css={{ width: 'fill' }}
            name="timeline"
            label="Timeline"
            value={timeline}
            onChange={(event) => setTimeline(event.currentTarget.value as Timeline)}
          >
            <option value="last_7_days">Last 7 days</option>
            <option value="last_30_days">Last 30 days</option>
            <option value="last_90_days">Last 90 days</option>
            <option value="last_365_days">Last year</option>
          </Select>

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
            Open setup checklist
          </Link>
        </Box>
      </Box>
    </SettingsView>
  )
}

function getApiBase(value: unknown): string {
  if (typeof value === 'string' && value.length > 0) return value
  return 'https://riposte.sh'
}

function getStatusMessage(status: RequestStatus): string {
  switch (status) {
    case 'loading':
      return 'Loading...'
    case 'syncing':
      return 'Starting sync...'
    case 'started':
      return 'Sync started'
    case 'error':
      return 'Error'
    case 'idle':
      return ''
  }
}

function formatLastSync(value: string | null): string {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}
