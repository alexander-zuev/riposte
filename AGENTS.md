# AGENTS.md

This file provides guidance to coding agents when working with this repository. Codex reads root `AGENTS.md` natively; Claude Code reads `.claude/CLAUDE.md`, which is a symlink to this file.

## What is Riposte

Open-source AI agent that wins Stripe disputes on autopilot. Deploys to Cloudflare Workers.

## Engineering Approach

Do not hallucinate product or integration behavior. We have enough primitives to build working
software from source material, real APIs, and focused tests.

- Ground decisions in local docs, first-party documentation, source code, or observed behavior from
  the real system under test.
- For Riposte product/dispute work, read `docs/private/specs/product-spec.md` and
  `docs/private/specs/research/product-research.md` before changing behavior or claims.
- When behavior matters, verify it directly with the real API/service in a safe test mode or sandbox.
  Record what was verified when it affects product, architecture, or future implementation.
- Use mocks to prepare our own boundaries, make tests deterministic, and cover error cases. Do not
  let mocks become the source of truth for a third-party API or platform behavior.
- Keep production paths deterministic where possible. AI can help collect, summarize, or draft, but
  code should validate shapes, enforce policy, persist auditable facts, and perform side effects.
- Separate facts, decisions, generated artifacts, and side effects in the domain model. This makes
  behavior testable and prevents polished output from hiding missing evidence.
- Prefer small end-to-end slices that touch the real boundary over broad speculative abstractions.

## Commands

Check `package.json` (root) and `apps/web/package.json` for available scripts before running anything.

## Generated Files

Do:

- Change the source config/schema first.
- Regenerate Worker types after `wrangler.jsonc` env var or binding changes:
  `pnpm --filter @riposte/web run cf-typegen`.
- Generate Drizzle migrations from schema changes:
  `pnpm --filter @riposte/web run db:generate`.
- Apply local development migrations only after generation:
  `pnpm --filter @riposte/web run db:migrate:dev`.
- Stop and ask if Drizzle prompts for an interactive choice or the intended migration is ambiguous.

Do not:

- Hand-edit `apps/web/worker-configuration.d.ts`.
- Hand-edit Drizzle migration files, journal, or snapshot metadata under
  `apps/web/src/server/infrastructure/db/migrations/`.
- Paper over missing `Env` properties with type assertions, local widened env types, or
  `as string` casts.

## Code Comments

Use concise JSDoc or comments where they capture intent, policy, or a non-obvious boundary nuance.
Avoid comments that restate the code or describe implementation details likely to change.

Keep inline comments minimal: one line by default, two only when a nuance genuinely needs it.
Multi-line JSDoc on a function/type is fine; rambling inline blocks inside a function body are not.

## Architecture

Monorepo with pnpm workspaces + Turborepo:

- `packages/core` — shared domain types, messaging schemas, error classes, logger
- `apps/web` — TanStack Start app deployed to Cloudflare Workers (SSR + API + queue consumers + cron)

### Frontend (`apps/web/src/`)

TanStack Start with TanStack Router. No RSC — traditional SSR + hydration. The frontend is
FSD-inspired, not a strict FSD template: use the existing layers and do not invent new top-level
layers without a clear reason.

- `routes/` — Thin TanStack Router adapters: route definitions, route loaders/search validation,
  layouts, API routes, and generated route boundaries. Route files should usually delegate UI to
  `pages/`.
- `pages/` — Screens/page compositions grouped by public/authed surfaces. Pages compose features,
  entities, and UI for one route or closely related routes.
- `features/` — Reusable user interactions and product capabilities, such as agent chat,
  connection management, and product forms. Add here when behavior is reused or large enough to be
  discovered independently from one page.
- `entities/` — Client-side business concepts and data adapters: domain-facing models, query and
  mutation hooks, selected IDs, and small entity UI.
- `ui/` — Presentation primitives, components, and stylesheets.
- `lib/` — Client utilities and providers (auth, analytics, env, router, query client).
- `types/` — App-wide client/shared TypeScript types.
- `client.tsx`, `server.ts`, `start.ts` — TanStack Start entry files.

### Storybook (`apps/web/.storybook/`)

Storybook is configured under `apps/web/.storybook`, not at the repo root.

- Run it with `pnpm --filter @riposte/web run storybook` or root `pnpm run storybook`.
- `apps/web/.storybook/main.ts` uses `stories: ['./**/*.stories.@(js|jsx|mjs|ts|tsx)']`, so story files are discovered relative to `apps/web/.storybook`.
- Shared Storybook title constants live in `apps/web/.storybook/story-paths.ts`.

### Backend (`apps/web/src/server/`)

DDD-inspired structure running on Cloudflare Workers:

- `entrypoints/` — Runtime entrypoints: TanStack Start server functions, queue consumers, and
  scheduled handlers
- `application/` — Message bus, handler registry, and command/event/query handlers
- `domain/` — Aggregates, entities, value objects, domain services, and repository interfaces
- `infrastructure/` — DB, repositories, auth, middleware, queues, Durable Objects, Agents,
  workflows, and external adapters

#### Repositories (the write path)

- Contracts are domain-facing: repository interfaces accept and return domain types, never Drizzle
  inferred row/insert types. Drizzle `Db*` types stay inside `infrastructure` implementations and
  do not leak into interfaces, handlers, routes, or domain models.
- Repositories move whole aggregates in and out through a closed method list: `byId`,
  `findByX` (command-use only), `insert(aggregate)`, `save(aggregate)`, `delete(aggregate)`.
- Banned: `update(id, fields)` field patches (they bypass invariants) and query-shaped methods
  such as `listForDashboard` (those belong in query handlers).
- `insert` and `save` are separate methods, never one upserting `save`: different SQL under
  version guarding, and their failures (`AlreadyExists` vs `ConcurrencyError`) need different
  retry policies.
- Raw Drizzle writes live only inside repositories.
  `rg "(db|tx)\.(insert|update|delete)\(" apps/web/src/server --glob '!**/repositories/**'`
  must return nothing; keep it that way.
- When a Drizzle schema column represents a domain union or branded type, type it at the schema
  boundary, e.g. `text('status').$type<StripeConnectionStatus>()`. Do not widen domain values to
  plain `string` and repair them throughout repositories.

#### Database capability boundaries

- Domain repositories accept only a transaction-scoped handle from the UoW. Target architecture:
  make this a branded `Tx` type so repositories cannot accidentally receive the root DB handle.
- Query handlers and read-only app/infra services should receive only a read capability:
  select/query, no insert/update/delete/transaction.
- Memoized `once()` services must not hold tx-scoped repositories. If a service needs repositories,
  create it from the active `Tx` as a per-call factory.
- Explicit machinery stores are the exception to domain repository rules: outbox relay, message
  receipts, poison-message bookkeeping, migrations, and test setup may use writable DB handles
  because they are infrastructure bookkeeping, not domain aggregate mutation.

#### Query handlers (the read path)

- The read path skips repositories and entities entirely:
  server fn or route → bus query → query handler → Drizzle SQL → DTO.
- Query handlers contain SQL directly and return DTOs; the Drizzle `select({...})` projection IS
  the DTO. No domain-class imports in query handlers.
- Never rehydrate entities to serve reads: it couples the API contract to the persistence shape
  and loads full clusters for a few fields.
- Litmus for repo finders: if the returned object is not mutated and saved in the same flow, it is
  a query in disguise — move the SQL to a query handler.
- New screens use this shape immediately; migrate existing `listForX` repo methods when touched.

#### Dependency direction

If a production-code change forces edits to an unrelated unit-test mock, stop and re-evaluate the
production-code dependency direction before touching the mock. Do not patch unrelated mocks to
satisfy import-time side effects. Prefer reducing import-time work or localizing dependency access,
especially in infrastructure modules that import Drizzle table schemas.

### Message Bus and Transactions

Commands, events, and queries defined in `packages/core/src/domain/messaging/`. One entry point:
`messageBus.handle(message)`. Transactional outbox: handlers persist events to `message_outbox`
in the same transaction as the state change, then relay to Cloudflare Queues.

#### Dispatch (asymmetric by message kind, on purpose)

- **Commands** — one handler inside the UoW: transaction + idempotency claim + outbox.
- **Events** — in-process fan-out; each subscriber runs in its own UoW with its own
  `${event.id}:${handlerId}` receipt, so redelivered events no-op per handler.
- **Queries** — no transaction, no claim, no outbox; straight SQL to a DTO.

#### Event authority vs subscriber execution

| Axis | Kind | Meaning |
| --- | --- | --- |
| Event authority | **Domain event** | Authoritative business fact minted by the PG domain model inside a UoW/outbox transaction |
| Event authority | **Integration event** | Cross-boundary observation or dirty ping from a system/runtime whose state is not the PG aggregate |
| Subscriber execution | **State subscriber** | Writes Postgres, so it runs through UoW: transaction + claim + outbox |
| Subscriber execution | **Effect subscriber** | Writes no Postgres, so it runs with no UoW, no transaction, and no claim |

Do not confuse the axes. Domain and integration events can both have state subscribers. The
difference is the event's authority, not the subscriber machinery.

Policies should react to domain events. Integration events feed reconciliation state subscribers:
query the owning system for current truth, update Postgres idempotently, and let the domain aggregate
raise real domain events if PG state changed.

#### Transaction rules

- No cross-boundary calls inside a Postgres transaction: no DO RPC, Stripe, LLM, R2, email, or
  queue send inside a handler's tx. The tell is `deps.services.*` (anything but `messageBus`)
  inside a handler that received `tx`. Audit:
  `rg "deps\.services\." apps/web/src/server/application/handlers/`.
- Why this is absolute: long-held transactions exhaust the Hyperdrive pool, block vacuum, and turn
  external slowness into database-wide failure.
- One `executeUoW` per message, never nested. One aggregate modified per transaction; a second
  aggregate update belongs in an event handler.
- Retry at the caller boundary (queue consumer, workflow step) by retrying the whole UoW, never
  individual SQL statements inside a repository.

#### Two gates: bus vs direct service calls

The bus carries domain meaning: commands, events, and shared queries. It does not carry every
function call.

| Situation | Use |
| --- | --- |
| Domain mutation / PG state change | Bus → handler → UoW → Postgres |
| External I/O or caller waits for an answer and no state changes | Direct application service or adapter |
| External I/O produces data that must become domain state | Service/adapter first, then command with the result as payload |
| No state changed yet, but work must not be lost | Mint durable intent state first, then it can ride the bus |

The violations are the crossings: a workflow step writing Postgres directly, or a handler calling
external services inside its transaction.

#### Effect subscribers

An event subscriber that performs external work and writes no Postgres — notifications, DO pokes,
workflow signals, starting workflows — is an effect subscriber, regardless of whether it reacts to a
domain event or an integration event:

- Species test for every new subscriber: does it write our Postgres? Yes → state subscriber
  (tx + claim). No → effect subscriber (no tx, no claim). Both → split it.
- No transaction and no claim around an effect: claim-then-effect loses the effect on crash;
  effect-then-claim leaves an orphan window. Dedupe is delegated to the target system via an
  idempotency key derived from the envelope id: deterministic workflow instance ids, provider
  idempotency keys, idempotent RPCs.
- No idempotency key available (e.g. Slack)? Accept rare duplicates; never reintroduce a claim
  around the effect. State each handler's dedupe policy in its doc comment.
- Effects read via bus queries, act via adapters, and report back via outcome commands, which
  carry their own transaction and claim.

#### Cross-store writes (Postgres ↔ DO ↔ Stripe ↔ queue)

- Atomicity across two stores does not exist. The owner of the fact commits first, alone, in its
  own transaction; followers converge through a separate, idempotent, machine-retried step.
- Every cross-store sequence names its machine-driven repair: queue retry, alarm drain, workflow
  timeout, or sweeper. `logger.error` before dropping a failed follower write is a confession,
  not a repair.
- `waitUntil` is a latency optimization only, never correctness. Deleting any `waitUntil` must
  leave the system correct, just slower.
- Ids minted on redelivery-prone paths (queue consumers, DO callbacks, workflow steps) must be
  deterministic per logical occurrence — never `Date.now()` or random suffixes, or redelivery
  synthesizes duplicates.
- An external write is bracketed by a pending state on the owning aggregate with three exits:
  confirmed, failed, expired. The pending state is the mutex against double submission and the
  sweeper's handle for reconciling against the external system.
- For unreliable cross-store observations, prefer dirty pings over edge payloads. Example:
  `integration.mcp_state_changed { productId }` should not carry authoritative
  connected/disconnected state. Its state subscriber queries the Agent/DO for current MCP truth
  before opening a PG transaction, reconciles product app-data-source rows idempotently, and the
  aggregate raises domain events such as `product.app_data_source_connected` only if PG state
  actually changed.

#### Agent schedules and DO intent outboxes

Inside Cloudflare Agents, use the Agents SDK scheduler for durable Agent-local intent when one
scheduled drain is enough. `schedule()` persists tasks in Agent SQLite and uses Durable Object alarms
underneath.

- For delayed/date schedules, pass `{ idempotent: true }` when repeated scheduling should collapse
  to one pending callback. Cron schedules are idempotent by default.
- The scheduled callback is the drain. It sends the queue message or performs the follower action.
  On transient failure, throw so the scheduler retry policy applies.
- Scheduled callbacks have bounded retries by default. Use explicit retry options,
  self-rescheduling, or periodic reconcile when losing the callback would matter.
- Do not call `ctx.storage.setAlarm()` directly inside an Agent; the Agents SDK owns and multiplexes
  the alarm.
- For raw Durable Objects, use the hand-rolled pattern: storage intent row + alarm drain.

#### Disposable stores

For R2/blob-like disposable stores, write the object before recording the DB pointer.

| Order | Result |
| --- | --- |
| ✅ Blob first | Possible orphan blob, sweepable |
| ❌ DB row first | Possible missing blob pointer, user-visible corruption |

Use deterministic object keys where retries can repeat the write, then record the outcome in
Postgres with a follow-up command.

#### Workflows (orchestration)

- Each step does exactly one unit of work: either one command through the bus (internal step) or
  one external call through an adapter (raw step). Never both in one step, never two of either.
- Zero domain logic in workflow bodies — the body only sequences steps and branches on
  command-returned discriminants. Decisions live in handlers.
- Command steps use `internalStepConfig`; `externalStepConfig` belongs only on raw external steps.
  External I/O results flow back into the domain as the follow-up command's payload: the domain
  never performs I/O — it ingests evidence as command payloads and emits decisions as events.
- Workflow steps that touch external systems should not call commands that perform that external I/O
  inside the handler. Do the external I/O in a raw step, then pass the result into a command if the
  result must update domain state.
- Bus queries are legal inside raw steps (reads need no transaction or claim).
- Step names and idempotency keys derive from the workflow instance id, so retries and engine
  replays memoize instead of re-executing.
- Orchestration vs choreography: a sequence or branching of external calls → workflow; a
  single-shot reaction to one event → effect subscriber. Never both driving one flow — that is two
  hands on one wheel.

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
- `better-result` does not throw for expected failures. It returns/propagates `Err`. It can still
  throw `Panic` for programmer defects inside Result callbacks/generators, and `unwrap()` throws on
  `Err`.
- Do not let expected throws travel upward through layers. Convert them at the boundary where they happen.
- Group errors with union types, not inheritance: `type SaveUserError = ValidationError | DatabaseError`.

### Layer rules

- Domain methods return `Result` for business rejection; throw only for invariant/programmer bugs.
- Repositories catch driver/Drizzle/postgres throws with `Result.tryPromise({ try, catch })` and return `Result.err(new DatabaseError(...))`.
- Application handlers propagate `Result` from domain/services/repos. Do not catch expected errors there.
- Entry points/server functions/queue consumers consume final Results with `match`, `isErr`, or error serialization.
- TanStack Start error middleware is a thrown-error safety net. It should catch framework control
  flow, validation adapter weirdness, and unexpected bugs. It does not observe normal
  `Result.err()` returns serialized through `toServerFnRpc(...)` or converted into HTTP responses.
- API routes should compose expected failures into a final `Result` and consume it once at the route
  boundary. This boundary handling is required: use `resultToApiResponse(...)` for normal JSON APIs,
  and route-specific `match`/overrides for redirects, webhooks, text, images, or streaming responses.
  The `ok`/`err` override callbacks are optional only when the generic JSON mapping is correct.
  Middleware remains only a thrown-error safety net.
- API routes should keep only transport validation/parsing that belongs to the route, then dispatch
  application work through `deps.services.messageBus().handle(createCommand(...))`. Put expected
  application errors beside the rest of the typed errors, not as ad hoc route-local wrappers.
- TanStack Query query/mutation functions should preserve Query semantics: consume `Result` at the query boundary and throw the typed `TaggedError` on `Err`, so `onError`, retries, error boundaries, and devtools continue to work. Prefer throwing `result.error` over wrapping it in a generic `Error`.
- Workflow steps are an adapter exception: retryable `Err` values throw the original error so the
  step retry policy applies; non-retryable `Err` values log the original error and throw
  `NonRetryableError` so the Workflow fails immediately without retrying.
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
class DuplicateMessageError extends TaggedError('DuplicateMessageError')<{
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

### Switches and handler errors

Every `switch` statement must include an explicit `default` case. Do not silently fall through or
use a no-op exhaustiveness marker in runtime code. If an unexpected default is reached inside a
command/event/query handler, log the unexpected value and return a typed `Result.err(...)` such as a
`ValidationError` or domain-specific `TaggedError`. Do not `throw` from handlers for expected or
classifiable failures; reserve `throw` for true programmer bugs, impossible invariants, or framework
control flow.

### UoW and retry

Drizzle rolls back only by throwing, so `executeUoW` may contain a small throw bridge: store the `Result.err`, call `tx.rollback()`, catch `TransactionRollbackError`, and return the stored `Result.err`. This is an adapter detail; outside UoW the contract remains `Promise<Result<T, E>>`. Retry policy (whole-UoW, at the caller boundary) is defined in Message Bus and Transactions.

For workflows, map handler `Result.err()` by retryability:

- `error.retryable === true` or an unexpected panic/bug that should be retried by the workflow
  runtime: throw from inside `step.do(...)`.
- `error.retryable === false`: log the original structured error, then throw `NonRetryableError`
  from inside `step.do(...)`.
- Business stop conditions such as `needs_input`, `deadline_missed`, or `ignore` should be normal
  `Ok` handler outputs, not `Err`.
- If an error has no explicit `retryable` flag, do not assume it is retryable merely because it is an
  `Err`. Classify it before deciding whether to throw.

```typescript
const result = await messageBus.handle(command)
if (result.isErr()) {
  if (result.error.retryable === true) throw result.error
  logger.error('workflow_step_non_retryable_error', { error: result.error })
  throw new NonRetryableError(result.error.message, result.error._tag)
}
```

### Logging and instrumentation

Do not `logger.error(..., { error })` immediately before rethrowing inside Sentry-instrumented entrypoints (`withSentry`, `instrumentDurableObjectWithSentry`, queue/scheduled wrappers). `logger.error` already forwards to Sentry via the logger hook, and the instrumentation captures the rethrow too. Either let the throw be captured, or log at `warn`/`debug` if an operational breadcrumb is useful.

## Testing

When you change behavior, add or refactor the minimal set of tests that actually exercises it. Do
not chase coverage numbers; cover the genuinely critical paths and the edge cases that would silently
break the feature. Actively try to break what you built: push inputs to their limits — boundaries,
extremes, empty/huge/malformed values, and the gnarly edges (timezones/DST, sub-hour offsets, date
and year rollovers, clock skew, concurrency) — and add light stress where it is cheap, without
overdoing it. The point is to find the failure before prod does. Prefer testing the real
implementation over mocks: tests are a backup that solidifies and verifies what we built, not a
ritual that asserts a wall of mocks was called. If a unit test would have to mock so much that it no
longer tests the real code, write a small integration test against the real boundary instead.

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
- For quick local inspection, the reliable default is querying through the running Docker container:
  `docker exec riposte-postgres psql -U postgres -d riposte -c "select ..."` for app data, or
  `-d riposte_test` for integration-test data. The compose service is named `postgres`, but the
  container name is `riposte-postgres`.
- Host `psql` can be faster when the local client/env is healthy because Postgres is published on
  `localhost:5432`, but do not spend time debugging it during product work; fall back to
  `docker exec riposte-postgres psql ...`.

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

R2:

- Use the real test-env R2 binding directly (`env.<BUCKET>.put/get/delete`).
- Use per-test object key prefixes and delete exact objects.
- For R2 event logic, keep schema/dispatch tests as pure unit tests unless the test actually needs bucket semantics.

Workflows:

- Use `introspectWorkflowInstance(env.MY_WORKFLOW, instanceId)` or `introspectWorkflow(env.MY_WORKFLOW)` from `cloudflare:test`.
- Always dispose introspectors with `await using` or explicit `dispose()`; otherwise Workflow state can persist into later tests.
- Prefer `introspectWorkflowInstance(...)` when the code uses deterministic workflow instance IDs; use `introspectWorkflow(...)` when instance IDs are generated by the workflow runtime.
- For real integration smoke tests, avoid mocking steps. Start the workflow through the same client/Agent path production uses, then assert with `waitForStatus(...)`, `waitForStepResult({ name, index? })`, and `getOutput()`.
- Use modifiers such as `disableSleeps`, `disableRetryDelays`, `mockStepResult`, `mockStepError`, and `mockEvent` only when the behavior under test specifically needs time/retry/event control.
- For expected failures, wait for `errored` and assert `getError()`.

Agents:

- Agents run on Workers and Durable Objects.
- Test route behavior with `exports.default.fetch(...)` or direct `worker.fetch(request, env, ctx)` plus `waitOnExecutionContext(ctx)`.
- For internal state, apply the same DO rules: unique IDs/names, `runInDurableObject` only for setup/inspection, and alarm draining when alarms are involved.

AI SDK:

- Do not call real models from routine unit tests. Use `MockLanguageModelV3` from `ai/test` for
  `generateText`, `streamText`, and `ToolLoopAgent` contract tests.
- Assert against `model.doGenerateCalls` / `model.doStreamCalls` when behavior depends on what the
  SDK sends to the provider, such as `prompt`, `tools`, `toolChoice`, and active-tool filtering.
- For streaming tests, import `simulateReadableStream` from `ai`, not `ai/test`; the `ai/test`
  re-export is deprecated.
- Use `mockValues` from `ai/test` for multi-step tool-loop tests where one model call returns a
  tool call and the next returns final text.
- Keep app policy separate from SDK contract tests: test active-tool derivation, context estimates,
  MCP readiness, and compaction logic in local unit suites; test only SDK integration semantics in
  AI SDK suites.

Playwright E2E with AIMock:

- Run with `pnpm --filter @riposte/web test:e2e`; headed/debug runs use
  `pnpm --filter @riposte/web test:e2e:ui`.
- `apps/web/playwright.config.ts` owns two `webServer` entries: AIMock first, then the real Vite /
  TanStack Start app. Do not replace this with Vitest browser mode for app E2E.
- Start AIMock with `pnpm exec aimock --config aimock.config.json`, not `llmock`. The app reaches it
  through `AI_MOCK_BASE_URL` in the `wrangler.jsonc` `test` env.
- The app server command must keep `CLOUDFLARE_ENV=test` so Workers bindings/vars come from the
  Wrangler `test` environment. Do not invent a Vite mode such as `--mode e2e`; server config rejects
  unknown modes.
- `.env.test` is for fake secrets only (`BETTER_AUTH_SECRET`, OAuth client secrets, Stripe test
  secrets, `E2E_DATABASE_URL`, etc.). Non-secret values such as client IDs, `APP_URL`, and
  `AI_MOCK_BASE_URL` belong in `wrangler.jsonc` under `env.test.vars`.
- Authenticate through the real Better Auth endpoint in the browser test:
  `page.request.post('/api/auth/sign-up/email', { headers: { origin: VITE_APP_URL,
  'x-captcha-response': 'XXXX.DUMMY.TOKEN.XXXX' } })`. Do not manually construct Better Auth
  cookies.
- If a protected page redirects to `/sign-in`, debug auth/session wiring first. It usually means the
  app server env and the test request env are not aligned.
- Create products through `/products/new` in E2E tests unless the test explicitly targets a lower
  layer. This caught the transaction/agent-priming race where the Durable Object read product setup
  before the product transaction committed.
- Do not add production hydration markers only for tests. Prefer Playwright locators and UI-visible
  readiness (`getByLabel`, `getByRole`, connected state, URL navigation).
- AIMock fixtures live under `apps/web/test/e2e/aimock/`. Use explicit prompt sentinels like
  `E2E_CHAT_STREAMS_AND_PERSISTS`; for tool loops use one fixture with `hasToolResult: false`
  returning `toolCalls`, and one with `hasToolResult: true` returning final text.
- Keep E2E workers at `1` unless fixtures and database cleanup are explicitly isolated for parallel
  runs. Clean up rows by the unique test user/product IDs only.

Workers AI (`AI`):

- Local simulation is not available; Cloudflare recommends `remote: true`.
- Do not call real AI from normal unit/integration tests.
- Wrap AI behind an adapter and mock it for routine tests.
- Reserve remote AI checks for explicit opt-in smoke tests with separate credentials, costs, and nondeterministic assertions.

Service bindings/assets/browser/vectorize/images:

- Use local simulated bindings when available.
- If a binding must be `remote: true`, make tests opt-in and use staging resources only.
- Never point automated tests at production remote bindings.

## Key Conventions

- Path aliases: `@web/*` → `src/*`, `@server/*` → `src/server/*`
- Package imports: `@riposte/core` (server), `@riposte/core/client` (browser-safe)
- Commit messages must use Conventional Commits, such as `feat: add dispute sync`,
  `fix: deduplicate Stripe webhooks`, or `docs: update agent guidance`.
- Formatting: oxfmt. Linting: oxlint. No ESLint/Prettier.
- No leading underscores on identifiers (`no-underscore-dangle`). Use `private`/`readonly` modifiers for class fields instead of `_field` naming; rename `_var` locals to a meaningful name.
- UI primitives: default to components in `apps/web/src/ui/components` instead of raw HTML controls. Use raw elements only when there is a clear exception.
- Styling: for colors, design tokens, typography, and reusable visual rules, reach for `apps/web/src/ui/stylesheets` first. If a needed token or utility is missing, ask why before adding one-off classes.
- UI copy: do not end short interface labels, helper text, validation messages, button text, badges, or table cells with periods. Full prose paragraphs can use normal punctuation.
- UI copy: do not use em dashes. Use commas, colons, or plain hyphens instead.
- Layout spacing: prefer flex/grid `gap-*` utilities. Do not add new Tailwind `space-x-*` or `space-y-*` layout utilities.
- Layout sizing: do not use arbitrary pixel Tailwind values like `min-h-[89px]` for normal layout. Use design tokens, semantic sizing, responsive constraints, or component variants. Arbitrary values are only acceptable for real external constraints such as a fixed third-party widget or asset, and the reason should be obvious from context.
- Forms: use TanStack Form for all forms, including small forms. Prefer `apps/web/src/ui/components/ui/field.tsx` primitives (`Field`, `FieldLabel`, `FieldError`, etc.) or build reusable wrappers around them.
- Server state: use TanStack Query for all queries and mutations. Do not hand-roll loading/error state for async server interactions when a query or mutation fits.
- Hooks: a hook that exposes domain data returns its `data` as either a domain model class instance (e.g. `AuthUser` in `apps/web/src/entities/auth/auth-user.ts`) or a domain-shaped object/type, never a raw DTO the consumer must reconstruct and never the raw `useQuery`/`useMutation` result object. Give the hook a curated return that mirrors the useful parts of the query: `{ data, isLoading, isError, refetch? }` (`data` is the domain model; add `refetch`/mutation actions only when needed). Consumers get ready-to-use domain objects from the hook and handle loading/error cleanly with early returns, instead of reconstructing domain objects or passing the raw query result around.
- Secrets: dotenvx-encrypted `.env` files committed to repo. Private keys in `.env.keys` (gitignored).
- All deployments target Cloudflare Workers, never Pages.

## Browser Automation

For project-related browser automation, especially Reddit/outreach research, use Playwright CLI with a named persistent session and an explicit profile path. Do not rely on Playwright's auto-generated daemon profile path because it can change between daemon/cache instances and lose browser state.

Local private setup:

- Session name: `riposte`
- Stable Chrome profile: `/home/alexander/.cache/riposte/playwright/chrome`
- Local proxy config: `.playwright/riposte-decodo.json`
- Launch command:

```bash
playwright-cli -s=riposte open https://www.reddit.com --browser=chrome --headed --config=.playwright/riposte-decodo.json --profile=/home/alexander/.cache/riposte/playwright/chrome
```

Do not commit `.playwright/`; it contains local proxy credentials.
