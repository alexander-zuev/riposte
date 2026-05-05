# AGENTS.md

This file provides guidance to coding agents when working with this repository. Codex reads root `AGENTS.md` natively; Claude Code reads `.claude/CLAUDE.md`, which is a symlink to this file.

## What is Riposte

Open-source AI agent that wins Stripe disputes on autopilot. Deploys to Cloudflare Workers.

## Commands

Check `package.json` (root) and `apps/web/package.json` for available scripts before running anything.

## Architecture

Monorepo with pnpm workspaces + Turborepo:

- `packages/core` — shared domain types, messaging schemas, error classes, logger
- `apps/web` — TanStack Start app deployed to Cloudflare Workers (SSR + API + queue consumers + cron)

### Frontend (`apps/web/src/`)

TanStack Start with TanStack Router. No RSC — traditional SSR + hydration.

- `routes/` — File-based routing (TanStack Router)
- `pages/` — Thin page orchestrators (compose features)
- `ui/components/` — Pure presentation components (Shadcn + Radix + Tailwind v4)
- `lib/` — Client utilities (auth, hooks, env, router)

### Backend (`apps/web/src/server/`)

DDD-inspired structure running on Cloudflare Workers:

- `entrypoints/` — Thin entry points (queue consumer, scheduled handler)
- `application/handlers/` — Message handler registry and types
- `infrastructure/` — DB (Drizzle + Postgres via Hyperdrive), auth (better-auth), queues, Durable Objects
- `functions/` — TanStack Start server functions (RPC from frontend)
- `middleware/` — Hono-style middleware (auth, error, logging)

### Message Bus Pattern

Commands, events, and queries defined in `packages/core/src/domain/messaging/`. Transactional outbox pattern: handlers persist events to `message_outbox` table in the same transaction, then relay to Cloudflare Queues.

## Database

- **Runtime:** `postgres` (postgres.js) via Cloudflare Hyperdrive — NOT `pg` (node-postgres)
- **Migrations:** Drizzle Kit, env encrypted with dotenvx (`.env.drizzle`)
- **Local:** Docker Postgres 18 with `pg_cron` + `pg_squeeze` extensions
- **Production:** PlanetScale Postgres with `pg_cron` + `pg_strict` enabled
- **Two connection users:** `postgres:postgres` for migrations (DDL), `riposte-app` for runtime (DML)

## `better-result`

Use `better-result` to make expected failures part of the function contract. Docs: `https://better-result.dev` / Source: `~/.opensrc/repos/github.com/dmmulroy/better-result/2.9.1/`

### Mental model

- `Result.err(...)` = an expected failure the caller can handle: validation, not found, duplicate message, authorization, DB/API/queue failure.
- `throw` = a bug or framework control flow: impossible state, missing setup/env, invalid lifecycle usage, `redirect()`, `notFound()`.
- Do not let expected throws travel upward through layers. Convert them at the boundary where they happen.
- Group errors with union types, not inheritance: `type SaveUserError = ValidationError | DatabaseError`.

### Layer rules

- Domain methods return `Result` for business rejection; throw only for invariant/programmer bugs.
- Repositories catch driver/Drizzle/postgres throws with `Result.tryPromise({ try, catch })` and return `Result.err(new DatabaseError(...))`.
- Application handlers propagate `Result` from domain/services/repos. Do not catch expected errors there.
- Entry points/server functions/queue consumers consume final Results with `match`, `isErr`, or error serialization.
- Fire-and-forget post-commit work, like waking the outbox relay in `waitUntil`, should log and swallow. The transaction already committed and the outbox row is durable.

### Composition rules

For 1-2 fallible calls, explicit early return is preferred:

```typescript
const parsed = parseCommand(input)
if (parsed.isErr()) return parsed

const saved = await repo.save(parsed.value)
if (saved.isErr()) return saved

return Result.ok(saved.value)
```

For 3+ dependent fallible calls, use `Result.gen`:

```typescript
return await Result.gen(async function* () {
  const command = yield* parseCommand(input)
  const aggregate = yield* Aggregate.create(command)
  const saved = yield* Result.await(repo.save(aggregate))

  return Result.ok(saved.id)
})
```

`yield* someResult` means: if Err, stop and return that Err; if Ok, unwrap the value. Use `Result.await(...)` for `Promise<Result<...>>`.

Use `match` only when ending the Result flow, usually at an adapter boundary:

```typescript
return result.match({
  ok: (value) => Response.json(value),
  err: (error) => Response.json(serializeError(error), { status: 400 }),
})
```

Avoid `unwrap()` in normal application code. It throws on Err. Use it only after an `isErr()` guard, in tests, or inside required bridges such as Drizzle transaction rollback.

### Tagged errors

Use `TaggedError` for typed errors with `_tag`, structured fields, `.is(...)`, and serialization:

```typescript
class DuplicateMessageError extends TaggedError("DuplicateMessageError")<{
  messageId: string
  message: string
  retryable: false
}>() {
  constructor(args: { messageId: string }) {
    super({
      messageId: args.messageId,
      message: `Duplicate message: ${args.messageId}`,
      retryable: false,
    })
  }
}
```

Use `matchError` / `matchErrorPartial` when choosing behavior by `_tag`. After `Result.deserialize`, errors are plain objects; match on `_tag`, not `.is()`.

### UoW and retry

Drizzle rolls back only by throwing, so `executeUoW` may contain a small throw bridge: store the `Result.err`, call `tx.rollback()`, catch `TransactionRollbackError`, and return the stored `Result.err`. This is an adapter detail; outside UoW the contract remains `Promise<Result<T, E>>`.

Retry at the caller boundary, not inside repositories. Queue consumer / workflow step retry should retry the whole transaction/UoW, not individual SQL statements.

### Logging and instrumentation

Do not `logger.error(..., { error })` immediately before rethrowing inside Sentry-instrumented entrypoints (`withSentry`, `instrumentDurableObjectWithSentry`, queue/scheduled wrappers). `logger.error` already forwards to Sentry via the logger hook, and the instrumentation captures the rethrow too. Either let the throw be captured, or log at `warn`/`debug` if an operational breadcrumb is useful.

## Testing

Test independence is enforced by mechanics, not intent:

- Generate unique IDs/prefixes per test and assert only on rows/resources owned by that test.
- Query by owned IDs, aggregate IDs, message IDs, or correlation IDs. Do not assert on "all pending rows" in a shared table unless the rows are isolated inside that test's transaction.
- Prefer transaction-scoped setup/assertions when another worker, Durable Object, queue, or alarm could observe and mutate committed rows before the assertion.
- Clean up with targeted deletes by the IDs created by the test. Do not use broad table truncation/deletes as cross-file coordination.
- A test must pass when run alone, repeated, or beside unrelated files in parallel. If that is not true, the test is depending on global state.

### Cloudflare binding tests

Use Cloudflare's Workers Vitest integration for Cloudflare binding integration tests. Current docs:

- Workers Vitest integration: `https://developers.cloudflare.com/workers/testing/vitest-integration/`
- Test APIs: `https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/`
- Isolation and concurrency: `https://developers.cloudflare.com/workers/testing/vitest-integration/isolation-and-concurrency/`
- Durable Object testing: `https://developers.cloudflare.com/durable-objects/examples/testing-with-durable-objects/`
- Remote/local bindings: `https://developers.cloudflare.com/workers/development-testing/`

General pattern:

- Import `env` and `exports` from `cloudflare:workers`; import event/test helpers from `cloudflare:test`.
- Prefer testing exported handlers with `exports.default.fetch(...)`, or direct handler calls plus `createExecutionContext()` and `waitOnExecutionContext(ctx)` when `waitUntil` side effects matter.
- Cloudflare storage isolation is per test file, not a license to share global names. Vitest still runs files concurrently and may reuse Workers/module caches. Use unique names/IDs/prefixes per test for every binding-backed resource.

Hyperdrive/Postgres:

- This is a real shared database via `localConnectionString`, not isolated Workers storage.
- Use transaction-scoped assertions when possible.
- Use unique test-owned IDs, emails, message IDs, aggregate IDs, and correlation IDs.
- Clean up with targeted deletes by owned IDs.
- Never assert on whole-table global state unless the test created and owns the whole table state.

KV (`AUTH_KV`, `CACHE_KV`):

- Use the real binding in integration tests: `env.AUTH_KV`, `env.CACHE_KV`.
- Prefix every key with a per-test ID and clean up exact keys.
- Do not rely on broad namespace emptiness or key listing order.
- Keep remote KV disabled for routine tests unless explicitly testing a remote staging namespace.

Queues (`BACKGROUND_QUEUE`, `CRITICAL_QUEUE`):

- Unit-test producer routing with mocked `Queue.send` and `Queue.sendBatch`.
- Integration-test queue consumers with `createMessageBatch(...)`, `createExecutionContext()`, and `getQueueResult(batch, ctx)` so ack/retry behavior is observable.
- Use unique message IDs.
- Do not depend on producer sends being delivered to a consumer unless the test explicitly drives the consumer.

Scheduled handlers:

- Call the handler with `createScheduledController({ cron, scheduledTime })`.
- Use `createExecutionContext()` and `waitOnExecutionContext(ctx)`.
- Assert the downstream observable effect or the exact DO/queue call owned by that cron test.

Durable Objects (`AUTH_RATE_LIMITER`, `OUTBOX_RELAY`):

- Prefer `env.DO_BINDING.newUniqueId()` for per-test objects.
- Use `idFromName(name)` only when the stable singleton name is the behavior under test.
- Use `runInDurableObject(stub, callback)` only to set up or inspect internals, including storage/alarm state.
- Use `runDurableObjectAlarm(stub)` to execute a scheduled alarm; it removes the scheduled alarm before invoking `alarm()` and returns `false` when no alarm is scheduled.

Durable Object alarms:

- When alarm-driven code can self-schedule, drain with `runDurableObjectAlarm(stub)` until it returns `false`, then assert final observable state.
- Treat the drain loop as the no-alarm boundary.
- Do not call `instance.alarm()` directly in integration tests unless deliberately bypassing Cloudflare alarm semantics.
- Do not assert exact alarm run counts unless that count is the behavior under test.

R2, when added:

- Configure an `r2_buckets` binding in the test Wrangler env and use `env.BUCKET.put/get/delete` directly.
- Use per-test object key prefixes and delete exact objects.
- For R2 event logic, keep schema/dispatch tests as pure unit tests unless the test actually needs bucket semantics.

Workflows, when added:

- Use `introspectWorkflowInstance(env.MY_WORKFLOW, instanceId)` or `introspectWorkflow(env.MY_WORKFLOW)` from `cloudflare:test`.
- Always dispose introspectors with `await using` or explicit `dispose()`; otherwise Workflow state can persist into later tests.
- Use modifiers to disable sleeps or mock events.
- Assert `waitForStatus`, step results, output, or error.

Agents, when added:

- Agents run on Workers and Durable Objects.
- Test route behavior with `exports.default.fetch(...)` or direct `worker.fetch(request, env, ctx)` plus `waitOnExecutionContext(ctx)`.
- For internal state, apply the same DO rules: unique IDs/names, `runInDurableObject` only for setup/inspection, and alarm draining when alarms are involved.

Workers AI (`AI`):

- Local simulation is not available; Cloudflare recommends `remote: true`.
- Do not call real AI from normal unit/integration tests.
- Wrap AI behind an adapter and mock it for routine tests.
- Reserve remote AI checks for explicit opt-in smoke tests with separate credentials, costs, and nondeterministic assertions.

D1, when added:

- Read migrations in Vitest config with `readD1Migrations(...)`.
- Expose migrations as a test binding and call `applyD1Migrations(env.DB, migrations)` from setup.
- Keep D1 data owned by the test just like KV/R2.

Service bindings/assets/browser/vectorize/images:

- Use local simulated bindings when available.
- If a binding must be `remote: true`, make tests opt-in and use staging resources only.
- Never point automated tests at production remote bindings.

## Key Conventions

- Path aliases: `@web/*` → `src/*`, `@server/*` → `src/server/*`
- Package imports: `@riposte/core` (server), `@riposte/core/client` (browser-safe)
- Formatting: oxfmt. Linting: oxlint. No ESLint/Prettier.
- Secrets: dotenvx-encrypted `.env` files committed to repo. Private keys in `.env.keys` (gitignored).
- All deployments target Cloudflare Workers, never Pages.
