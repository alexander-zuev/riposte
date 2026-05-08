import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  runTestQuery,
  testQueryKindSchema,
  type TestQueryKind,
} from '@web/server/entrypoints/functions/test-query.fn'
import { Badge } from '@web/ui/components/ui/badge'
import { Button } from '@web/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@web/ui/components/ui/card'
import { useCallback, useMemo, useState } from 'react'

export const Route = createFileRoute('/test-query')({
  component: TestQueryPage,
})

const testQueries: Array<{
  kind: TestQueryKind
  label: string
  expected: string
}> = [
  { kind: 'success', label: 'Success', expected: 'No retry' },
  { kind: 'database-retryable', label: 'Database retryable', expected: 'Retries' },
  { kind: 'database-non-retryable', label: 'Database non-retryable', expected: 'No retry' },
  { kind: 'queue-retryable', label: 'Queue retryable', expected: 'Retries' },
  { kind: 'queue-non-retryable', label: 'Queue non-retryable', expected: 'No retry' },
  { kind: 'internal', label: 'Internal server', expected: 'No retry unless retryable changes' },
  { kind: 'validation', label: 'Validation', expected: 'No retry' },
  { kind: 'auth', label: 'Authentication', expected: 'No retry' },
  { kind: 'authorization', label: 'Authorization', expected: 'No retry' },
  { kind: 'not-found', label: 'Not found', expected: 'No retry' },
  { kind: 'rate-limit', label: 'Rate limit', expected: 'No retry' },
  { kind: 'throw-error', label: 'Thrown error', expected: 'Depends on thrown error shape' },
]

function TestQueryPage() {
  const [activeKind, setActiveKind] = useState<TestQueryKind>('success')
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ['test-query', activeKind] as const, [activeKind])
  const query = useQuery({
    queryKey,
    queryFn: async () => unwrapTestQueryResult(await runTestQuery({ data: { kind: activeKind } })),
    enabled: false,
  })

  const handleSelectKind = useCallback(
    (kind: TestQueryKind) => {
      setActiveKind(kind)
      queryClient.removeQueries({ queryKey: ['test-query'] })
    },
    [queryClient],
  )
  const handleRunQuery = useCallback(() => {
    query.refetch().catch(() => undefined)
  }, [query])
  const handleResetQuery = useCallback(() => {
    queryClient.removeQueries({ queryKey })
  }, [queryClient, queryKey])

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 p-8 text-foreground">
      <header>
        <h1>Test query retries</h1>
        <p className="mt-2 text-muted-foreground">
          Run server-query outcomes and inspect TanStack Query retry behavior.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {testQueries.map((item) => (
          <TestQueryButton
            key={item.kind}
            item={item}
            isActive={activeKind === item.kind}
            onSelect={handleSelectKind}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {testQueries.find((item) => item.kind === activeKind)?.label}
            <Badge variant="secondary">{testQueryKindSchema.parse(activeKind)}</Badge>
          </CardTitle>
          <CardDescription>
            Expected: {testQueries.find((item) => item.kind === activeKind)?.expected}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleRunQuery}>
              Run query
            </Button>
            <Button type="button" variant="secondary" onClick={handleResetQuery}>
              Reset
            </Button>
          </div>

          <dl className="grid gap-3 md:grid-cols-3">
            <StatusItem label="status" value={query.status} />
            <StatusItem label="fetchStatus" value={query.fetchStatus} />
            <StatusItem label="failureCount" value={String(query.failureCount)} />
            <StatusItem label="isFetching" value={String(query.isFetching)} />
            <StatusItem label="isError" value={String(query.isError)} />
            <StatusItem label="isSuccess" value={String(query.isSuccess)} />
          </dl>

          <pre className="max-h-96 overflow-auto border bg-surface p-3 text-xs">
            {JSON.stringify(
              {
                data: query.data,
                error: query.error,
              },
              null,
              2,
            )}
          </pre>
        </CardContent>
      </Card>
    </main>
  )
}

function TestQueryButton({
  item,
  isActive,
  onSelect,
}: {
  item: (typeof testQueries)[number]
  isActive: boolean
  onSelect: (kind: TestQueryKind) => void
}) {
  const handleClick = useCallback(() => {
    onSelect(item.kind)
  }, [item.kind, onSelect])

  return (
    <Button
      type="button"
      variant={isActive ? 'default' : 'secondary'}
      className="justify-start"
      onClick={handleClick}
    >
      {item.label}
    </Button>
  )
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border p-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  )
}

function unwrapTestQueryResult(result: Awaited<ReturnType<typeof runTestQuery>>) {
  if (result.status === 'error') throw result.error

  return result.value
}
