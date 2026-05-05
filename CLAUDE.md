# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Durable Objects

Use Cloudflare's Vitest helpers from `cloudflare:test` for Durable Object integration tests:

- Use `runInDurableObject(stub, callback)` only to set up or inspect DO internals, including storage/alarm state.
- Use `runDurableObjectAlarm(stub)` to execute an alarm. It removes the scheduled alarm before invoking `alarm()`, and returns `false` when no alarm is scheduled.
- When testing alarm-driven flows that can self-schedule, drain with `runDurableObjectAlarm(stub)` until it returns `false`, then assert on observable state. Treat the drain loop as the no-alarm boundary; avoid a separate immediate `runDurableObjectAlarm(stub) === false` assertion because workerd may surface overdue alarms asynchronously.
- Do not call `instance.alarm()` directly in integration tests unless deliberately bypassing Cloudflare alarm semantics.
- Do not assert exact alarm run counts unless that count is the behavior under test; batching, self-scheduling, and leftover local state can make counts brittle. Prefer asserting final persisted/observable state after the drain loop.
- Use targeted cleanup for real DB rows. Avoid broad table deletes in parallel integration tests because another file may own rows in the same table.

## Key Conventions

- Path aliases: `@web/*` → `src/*`, `@server/*` → `src/server/*`
- Package imports: `@riposte/core` (server), `@riposte/core/client` (browser-safe)
- Formatting: oxfmt. Linting: oxlint. No ESLint/Prettier.
- Secrets: dotenvx-encrypted `.env` files committed to repo. Private keys in `.env.keys` (gitignored).
- All deployments target Cloudflare Workers, never Pages.
