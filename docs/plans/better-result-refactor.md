# Refactor: Adopt `better-result`

## Why

Error types are invisible in function signatures. As we add Stripe dispute handlers chaining 3-5 fallible ops, we need typed errors, generator composition, and exhaustive matching.

## Core principles

Handlers never intentionally throw. All expected errors → `Result.err()`. Unexpected errors (bugs) still throw naturally — they're panics. The UoW and middleware catch panics as safety nets.

The deciding question is: **is the caller expected to reason about this outcome?** If yes, return `Err`. If no, throw as a panic/bug. "Unrecoverable" is not enough to justify throwing: card declined, duplicate message, validation failure, auth rejection, and transient infrastructure failures are still expected system outcomes and belong in `Result.err()`.

**What throws (never Result):**
- **Panics** — bugs in code, null derefs, better-result Panic from buggy callbacks. Fix the code.
- **Raw/unknown thrown errors** — unmodeled bugs or dependency/runtime failures. Edges log/capture them and return generic failure outward.
- **TanStack control flow** — `notFound()`, `redirect()`. Framework machinery, not errors.
- **Cloudflare retry/rollback signals at platform edges** — Durable Object alarms, Workflows steps, and Drizzle/storage transactions throw only when the platform contract requires throw for retry or rollback. This is a bridge at the boundary, not a domain/application pattern.
- **Missing internal wiring where the message type is known but no implementation exists** — panic. Unknown external input is still `Err`.

**What returns Result:**
- Everything else. Domain errors, infrastructure errors, routing errors. If the caller makes a decision based on error type → Result.
- **AuthenticationError is boundary-specific:** page/navigation flows may redirect; RPC mutation/query flows should usually serialize an auth `Result.err()` so the client adapter can decide whether to redirect, show login UI, or let React Query `onError` handle it. Do not bake "always redirect" into domain/application handlers.
- **UnhandledException is temporary tech debt:** use it only at an unmodeled third-party/platform boundary so it is grep-able. Replace it with specific TaggedErrors once the failure mode is understood.

**Reference:** `https://better-result.dev/advanced/serialization#testing-serialization` for serialize/deserialize test patterns.
**opensrc source:** `/home/alexander/.opensrc/repos/github.com/dmmulroy/better-result/2.9.1/`

## Architecture rules

The codebase should keep three layers distinct:

1. **Boundaries wrap throwing code.** Repositories, SDK adapters, platform bindings, JSON parsing, and network calls use `Result.try` / `Result.tryPromise` and map throws to TaggedErrors.
2. **Domain/application composes Results.** No `try/catch` for expected errors. Use early returns for short flows, `Result.gen` for dependent multi-step flows, and `matchError` at backend edges for exhaustive behavior.
3. **Edges consume Results.** Server functions serialize, route handlers return HTTP responses, queue/scheduled/DO/workflow entrypoints decide ack/retry/throw, and UI call sites decide inline rendering vs redirects.

Shared error classes live in `@riposte/core` so Workers and TanStack Start use the same `_tag` contract. Backend code can use `.is()` and `matchError` on real TaggedError instances. Client code must assume deserialized errors are plain data and switch on `_tag`.

## Edge thrown-value policy

Every entrypoint boundary classifies thrown values in this order:

1. **Framework/platform control flow:** preserve and rethrow. Examples: TanStack `redirect()` / `notFound()`, platform retry/rollback throws.
2. **Panic:** bug/invariant failure. Log/capture, return generic failure outward if there is a client, and do not retry by default.
3. **TaggedError:** modeled expected failure that escaped by being thrown. Translate to the edge's modeled response (`Result.err` wire value, HTTP status JSON, queue ack/retry from `retryable`, etc.).
4. **Raw `Error` / unknown thrown value:** unmodeled bug or dependency/runtime failure. Log/capture and return generic failure outward. Do not expose details. Retry only when that edge has an explicit platform reason to retry unknown infrastructure failure.

Check `isPanic(error)` before generic tagged-error checks. `Panic` has `_tag = "Panic"` and must never be serialized to clients as a recoverable/domain error.

This policy also applies when consuming a `Result.err` at an edge: panic-like or unknown values become generic internal failures; modeled `TaggedError`s become modeled responses. In normal application code, panics should throw rather than travel inside `Result.err`.

## Plan adjustments from the Cloudflare/TanStack guide

These additions modify the remaining stages and create follow-up stages after the current Stage 10 cleanup.

- Add thin Result-returning adapters for each platform binding or external SDK we touch: Postgres/Hyperdrive, Queues, Durable Object RPC, R2/KV/D1 if introduced, Stripe when dispute work starts. One adapter call gets one `Result.tryPromise`, with a discriminating `catch`.
- Keep `waitUntil` for lossy observability and cache warmup only. Domain events, webhooks, financial/compliance effects, and cross-context consistency stay on the transactional outbox.
- Treat every structured-clone/network boundary as serialization-required: TanStack server functions, Durable Object RPC, and Workflow step return values that carry `Result` as data. The serializer itself is generic; transport wrappers are boundary-specific.
- Do not wrap TanStack loaders wholesale in `Result.try`; loaders may need to throw `redirect()` / `notFound()`. Use Result inside the loader, then translate at the loader edge.
- For TanStack Query, default mutations/RPC to returning `Result` as resolved data so validation/domain errors remain typed. Use Query-style thrown errors only for query functions where the UI wants `error` state/error boundaries.
- Keep top-level `try/catch` as safety nets at every entrypoint category: server-function middleware, HTTP route middleware, queue consumer, scheduled handler, Durable Object methods/alarms, and Workflow step bodies where contextual logging or retry translation is needed.
- Retry intent is a boundary decision. Existing `retryable` fields can still guide queues, but Workflows/DO alarms express retry by throwing at the platform edge and express permanent/domain failure by returning serialized `Err`.

## Stage 1: Rewrite error classes to TaggedError ✅ DONE

**Scope:** `packages/core/src/infrastructure/errors/`

Drop the 3-tier class hierarchy (`BaseError` → `DomainError`/`InfrastructureError`/`ApplicationError`). Replace with flat TaggedError classes. Grouping moves to union types (docs call this "hierarchies" but it's just unions, no class inheritance).

**Decisions:**
- `retryable`: literal `false` for domain errors (compile-time guarantee), `boolean` only for `DatabaseError` (varies by SQLSTATE)
- Computed messages: custom constructors per skill Pattern 2 — constructor takes meaningful fields, derives message, calls `super({...args, message})`
- DatabaseError: custom constructor (not factory) — keeps SQLSTATE extraction + retryability logic inside, consistent with all other errors
- `ValidationIssue`: stays as plain type (data shape, not an error — consumed by TanStack Form on client)

**Error class mapping:**

| Old | New |
|-----|-----|
| `AuthenticationError(message?)` | `TaggedError("AuthenticationError")<{message: string; retryable: false}>()` — default message in constructor |
| `AuthorizationError(message?)` | `TaggedError("AuthorizationError")<{message: string; retryable: false}>()` — default message in constructor |
| `ValidationError(issues, message?)` | `TaggedError("ValidationError")<{issues: ValidationIssue[]; message: string; retryable: false}>()` — default message in constructor |
| `EntityNotFoundError(entity, id?)` | `TaggedError("EntityNotFoundError")<{entity: string; id?: string; message: string; retryable: false}>()` — computed message in constructor |
| `RateLimitError(message?)` | `TaggedError("RateLimitError")<{message: string; retryable: false}>()` — default message in constructor |
| `DatabaseError(message, cause?)` | `TaggedError("DatabaseError")<{message: string; cause?: unknown; retryable: boolean; pg?: PostgresErrorMeta}>()` — custom constructor extracts pg meta + computes retryable |
| `DuplicateMessageError(messageId)` | `TaggedError("DuplicateMessageError")<{messageId: string; message: string; retryable: false}>()` — computed message in constructor |
| `UnknownMessageTypeError(messageType)` | `TaggedError("UnknownMessageTypeError")<{message: string; retryable: false}>()` — computed message in constructor |
| `NoHandlerError(kind, messageName)` | Deleted in Stage 13 — missing internal handlers now panic |

Union types for grouping (same files):
```typescript
type DomainError = AuthenticationError | AuthorizationError | ValidationError | EntityNotFoundError | RateLimitError
type InfrastructureError = DatabaseError | DuplicateMessageError
type ApplicationError = UnknownMessageTypeError | InternalServerError
```

Delete `base.errors.ts`.

**Tests:**
- Each error: construct, verify `_tag`, `message`, `retryable`, and any extra fields
- DatabaseError: construct with mock PostgresError cause → verify `pg` meta extracted, `retryable` computed correctly
- DatabaseError: construct with non-retryable SQLSTATE (class 23) → verify `retryable: false`
- DatabaseError: construct with no cause → verify `retryable: true` (default)
- `.is()` type guard works on each error class
- `isTaggedError()` returns true for all our errors

## Stage 2: Update `instanceof` → `.is()` checks ✅ DONE

Mechanical replacement across 4 files:

| File | Change |
|------|--------|
| `message-bus.ts` (×2) | `error instanceof DuplicateMessageError` → `DuplicateMessageError.is(error)` |
| `queue-consumer.ts` | `error instanceof Error && 'retryable' in error` → `isTaggedError(error) && 'retryable' in error` |
| `error.middleware.ts` | `instanceof AuthenticationError` / `instanceof BaseError` → `.is()` checks |
| `message-bus.unit.test.ts` | Update assertion to use `.is()` |

No new tests — existing `message-bus.unit.test.ts` already covers these paths, just update assertions.

## Stage 3: Rewrite `serializeError` with `.is()` checks ✅ DONE (completed in Stage 1)

**Scope:** `packages/core/src/infrastructure/errors/types.ts`

Replace `instanceof` chain with `.is()` type guards. `ServerError` wire format type stays unchanged for now — deleted in Stage 10 after full migration.

```typescript
export function serializeError(error: unknown): ServerError {
  if (ValidationError.is(error)) return { code: 'VALIDATION_ERROR', ... }
  if (EntityNotFoundError.is(error)) return { code: 'NOT_FOUND', ... }
  // etc.
}
```

**Tests:**
- Pass each TaggedError instance → verify correct `ServerError` code and fields
- Pass unknown error → verify `INTERNAL_SERVER_ERROR`
- Pass plain `Error` → verify `INTERNAL_SERVER_ERROR`

## Stage 4: Rewrite UoW as Result ↔ throw bridge ✅ DONE

**Scope:** `apps/web/src/server/application/message-bus/unit-of-work.ts`

**Problem:** Drizzle transactions rollback on throw. Handlers returning `Result.err()` would commit with bad state.

**Solution:** UoW inspects the Result. On Err: store error, call `tx.rollback()` (throws `TransactionRollbackError`), catch it, convert back to `Result.err()`.

```typescript
export async function executeUoW<T, E>(
  work: (tx: DrizzleDb) => Promise<Result<T, E>>, msgId: string,
): Promise<Result<T, E | DatabaseError | DuplicateMessageError>> {
  let handlerErr: E | undefined

  const value = await runWithEventContext(async () =>
    db.transaction(async (tx) => {
      const receipt = await outboxRepo.assertMessageNotProcessed(msgId)
      if (receipt.isErr()) {
        handlerErr = receipt.error
        tx.rollback()
      }

      const result = await work(tx)
      if (result.isErr()) {
        handlerErr = result.error
        tx.rollback() // throws TransactionRollbackError
      }

      // Ok path — persist events, commit
      const events = getCollectedEvents()
      if (events.length > 0) await outboxRepo.persistEvents(events)
      return result.value
    }),
  )

  // ... trigger relay ...
}
```

Catch block converts `TransactionRollbackError` + stored error back to `Result.err()`. `DuplicateMessageError` from `assertMessageNotProcessed()` is now a typed `Result.err()` from the repository, bridged through rollback and returned to the message bus.

**Tests:**
- Work returns `Result.ok(value)` → UoW returns `Result.ok(value)`, events persisted
- Work returns `Result.err(error)` → UoW returns `Result.err(error)`, transaction rolled back, no events persisted
- Work panics (throws) → UoW re-throws, transaction rolled back
- Duplicate message → UoW returns `Result.err(DuplicateMessageError)`

**Status:** complete for current outbox/UoW path. Unit + integration tests passing.

## Stage 5: Handlers + message bus return `Result<T, E>` ✅ DONE

**Scope:** `apps/web/src/server/application/registry/types.ts`, handler files, `message-bus.ts`

Change handler type signatures:
```typescript
type CommandHandler<TCmd, TResult, TError> = (
  cmd: TCmd, env: Env, tx: DrizzleDb,
) => Promise<Result<TResult, TError>>
```

Message bus returns Result for expected routing failures. Unknown external input (`UnknownMessageTypeError`) is a typed `Result.err()`. A declared message with no registered internal command/query handler is a wiring bug and panics at the registry edge.

`DuplicateMessageError` from UoW is converted by message bus to `Result.ok()` (silent success, idempotent).

Event subscribers are independent. Event registry entries use stable handler ids:

```typescript
UserSignedUp: [{ id: 'auth.handleUserSignedUp', handle: handleUserSignedUp }]
```

Each event handler runs in its own UoW with a handler-level receipt id:

```typescript
`${event.id}:${handler.id}`
```

This prevents one successful subscriber from blocking another subscriber on retry. Duplicate receipts are treated as idempotent success per handler.

Currently only stub handlers exist — minimal change. As real handlers are built, they'll use `Result.tryPromise`, `Result.gen`, etc.

**Status:** complete for current message-bus/queue-consumer path. Unit tests passing (`54/54`).

**Stage 13 update:** missing command/query handlers now panic. `NoHandlerError` was deleted. Keep `UnknownMessageTypeError` as `Err` for untrusted or version-skewed messages.

## Stage 6: Server functions return serialized Results ✅ DONE

**Scope:** `apps/web/src/server/entrypoints/functions/`

All server functions return `toServerFnRpc(result)` which produces `RpcResult<T, E>` — a plain-object wire format that survives TanStack Start's seroval serialization.

**Two problems solved:**
1. **Type-level:** TanStack Start's `ValidateSerializableMapped` rejects `[Symbol.iterator]` (from TaggedError's `Result.gen` support) and `cause: unknown` on Error. Fix: `Serializable<E>` mapped type strips methods and maps `unknown` → `JsonValue`.
2. **Runtime-level:** seroval's `ShallowErrorPlugin` catches any `value instanceof Error` and reconstructs as bare `new Error(message)`, destroying `_tag` and custom fields. Fix: spread error into plain object to break prototype chain.

Upstream issues filed: better-result [#79](https://github.com/dmmulroy/better-result/issues/79), TanStack Router [#7339](https://github.com/TanStack/router/issues/7339).

**Implementation:** `apps/web/src/server/infrastructure/rpc/rpc-result.ts` — `toServerFnRpc()`, `toRpc()`, `fromRpc()`, `RpcResult<T, E>`, `Serializable<E>`.

**`inputValidator` note:** runs before handler — it's TanStack's code. When it fails, TanStack throws a mangled `Error(JSON.stringify(zodIssues))`. These errors still throw → caught by middleware (Stage 7) → serialized there.

## Stage 7: Middleware → boundary safety nets ✅ DONE

**Scope:** `apps/web/src/server/infrastructure/middleware/error.middleware.ts`

Middleware is now a pure safety net. With Result pattern, expected errors are returned as values — they never reach middleware. Middleware only catches:

1. **Platform primitives** (`redirect`, `notFound`) → rethrow
2. **Zod validation** (TanStack's `inputValidator` mangles ZodError into `Error(JSON.stringify(issues))`) → parse and serialize as `ValidationError`
3. **Panics/bugs** → log, return generic `InternalServerError`

Two handlers, intentionally not abstracted:
- `handleFunctionError` → throws `toServerFnRpc(Result.err(...))` for server fns
- `handleRouteError` → returns `Response.json(...)` for API routes

**Tests (pending):**
- Panic → logged, generic error serialized
- `notFound()`/`redirect()` → rethrown
- Zod-mangled error → parsed into `ValidationError`, serialized

## Stage 8: Client RPC deserialization ✅ DONE

**Scope:** `apps/web/src/lib/clients/rpc.ts`, `apps/web/src/lib/errors/client.errors.ts`

Replaced by `fromRpc()` in `@server/infrastructure/rpc/rpc-result.ts`. Route loaders call `fromRpc` directly and handle Results inline — no wrapper needed.

**Deleted:**
- `apps/web/src/lib/clients/rpc.ts` — old `rpc()` using `ServerError`/`isServerError`/`throwServerError`. Zero imports.
- `apps/web/src/lib/errors/client.errors.ts` — old `throwServerError()`. Zero imports.

**Pattern for loaders:**
```typescript
const wire = await ensureSession()
const result = fromRpc(wire)
if (result.isErr()) throw redirect({ to: '/sign-in' })
return { session: result.value }
```

**Note:** `Result.deserialize()` produces plain objects, not TaggedError instances. Use `_tag` string matching on client, not `.is()`. Future mutations will use `fromRpc` inside `useMutation`'s `mutationFn`.

**Open question:** middleware throw path (inputValidator Zod failures reject the promise on client). Currently no call site handles this — revisit when mutations are added. May need a thin `rpc()` wrapper then, or handle per-mutation.

## Stage 9: Client error handling → per-call-site ✅ DONE

Centralized `throwServerError()` deleted. Each call site handles its own `Result` from `fromRpc`:

```typescript
const result = fromRpc(wire)
if (result.isErr()) throw redirect({ to: '/sign-in' })
return { session: result.value }
```

Backend uses `matchError` on real TaggedError instances. Client uses `_tag` string matching. Two patterns, each simplest for its context. Future feature call sites will use `switch (result.error._tag)` with exhaustive `never` default.

## Stage 10: Delete dead code ✅ DONE

**Deleted:**
- `types.ts` — `ServerError`, `serializeError()`, `isServerError()`, `SERVER_ERROR_CODES`
- `api/result.ts` — old `Result<T>` type, `ok()`
- `lib/clients/rpc.ts` — old `rpc()` wrapper
- `lib/errors/client.errors.ts` — `throwServerError()`
- `base.errors.ts` — hierarchy classes (deleted in Stage 1)

**Moved:** `ValidationIssue` type → `domain.errors.ts` (co-located with `ValidationError`)

**Cleaned up:** re-exports in `index.ts`, `client.ts`, `errors/index.ts`.

Typecheck passes, zero dead imports remaining.

## Stage 11: Boundary adapter audit

**Scope:** `apps/web/src/server/infrastructure/**`, future Stripe/dispute integrations

Every file that talks to a platform binding, SDK, driver, or external API should expose Result-returning functions and contain the throwing boundary locally.

**Checklist:**
- Repositories wrap Drizzle/postgres throws with `Result.tryPromise` and map to `DatabaseError`.
- Queue client wraps Cloudflare Queue sends and maps to `QueueError`.
- Outbox relay wakeups use `waitUntil` only as best-effort notification; the durable source of truth remains the outbox row.
- Future Stripe adapter maps SDK-specific errors (`card`, `api`, rate limit, auth, network `TypeError`, unknown) into explicit TaggedErrors. Start with `UnhandledException` only where the boundary is not modeled yet.
- Future R2/KV/D1 adapters get one file per binding and never leak platform throws into application/domain code.

**Tests:**
- Representative adapter maps known platform/SDK error to the expected TaggedError.
- Unknown thrown value maps to `UnhandledException` or the boundary's explicit unknown error.
- Success path preserves the driver/SDK result shape.

## Stage 12: Edge safety net helpers

**Scope:** `apps/web/src/server/entrypoints/**`, `apps/web/src/server/infrastructure/middleware/**`, Durable Objects

The codebase should have one safety-net wrapper per entrypoint category, not scattered ad hoc `try/catch`.

**Targets:**
- Server functions: current function middleware is the safety net.
- HTTP routes: current route middleware is the safety net.
- Queue consumer: classify panics/raw unknown errors separately from typed `Err`; panics should be logged/DLQ'd, not retried by default.
- Scheduled handler: covered by worker-level `Sentry.withSentry`; no local try/catch needed unless future code must translate `Result` into throw/return. ✅ DONE
- Durable Object methods: add a method/RPC wrapper when DO RPC starts returning serialized Results.
- Durable Object alarms: translate transient Result errors to throw for Cloudflare retry; log and swallow permanent failures when retry would be wrong.
- Workflow steps: catch only to add context before rethrowing, or to convert Result to the platform's return-vs-throw retry contract.

**Tests:**
- Panic becomes generic 500/logged result/failed queue handling depending on edge.
- TanStack `redirect()` / `notFound()` still rethrow through route/function wrappers.
- Scheduled outbox relay trigger failure is not swallowed and propagates to the worker-level Sentry boundary. ✅ DONE
- Server-function middleware checks `isPanic()` before `isTaggedError()` and returns generic `InternalServerError`.
- Route middleware checks `isPanic()` before `isTaggedError()` and returns generic 500 JSON.
- Queue consumer does not retry panics by default.

## Stage 13: Panic audit and missing-handler migration

**Scope:** `apps/web/src/server/application/message-bus/message-bus.ts`, registry lookup helpers, core application errors/tests

Some current typed errors model bugs instead of caller-recoverable outcomes. Convert those to panics only after the edge policies from Stage 12 classify panics/raw errors correctly.

**Required first:** server-function middleware, route middleware, and queue consumer must treat panics/raw errors as bug signals:
- log/capture internally;
- return generic failure outward if there is a client;
- do not expose panic message/stack/details;
- let retryable queue failures reach Cloudflare's native DLQ at max attempts.

**Keep as `Err`:**
- `UnknownMessageTypeError` for untrusted or version-skewed external input.
- `DuplicateMessageError` for idempotency.
- validation, auth, not-found, rate-limit, DB, queue, and other infrastructure/domain failures the caller can reason about.

**Convert to panic/throw:**
- missing command handler for a declared `CommandName`;
- missing query handler for a declared `QueryName`;
- impossible message kinds after message validation;
- missing required env bindings/config at runtime;
- malformed internal commands/events built by our own code;
- failed exhaustive-switch defaults for internal unions.

**Target message-bus change:**
```typescript
function getCommandHandlerOrPanic(name: CommandName): AnyCommandHandler {
  const handler = COMMAND_HANDLERS[name]
  if (!handler) throw panic('Missing command handler', { name })
  return handler
}

function getQueryHandlerOrPanic(name: QueryName): AnyQueryHandler {
  const handler = QUERY_HANDLERS[name]
  if (!handler) throw panic('Missing query handler', { name })
  return handler
}
```

`handleCommand()` and `handleQuery()` should no longer `yield*` handler lookup as a `Result`. They should panic during lookup only when the registry is internally miswired, then compose the handler/UoW `Result` normally.

**Event policy:** zero subscribers can be valid. Keep `EVENT_HANDLERS[event.name] ?? []` returning ok/no-op unless a specific event requires at least one subscriber by invariant.

**`NoHandlerError` outcome:** deleted. Runtime dispatch no longer returns it.

**Tests:**
- unknown external message type returns `Result.err(UnknownMessageTypeError)`;
- known command with missing registry entry throws panic;
- known query with missing registry entry throws panic;
- queue consumer retries panic/raw failures and lets Cloudflare's native DLQ receive them at max attempts;
- no-handler typed error tests are deleted.

## Stage 14: Shared Result wire primitives

**Scope:** current `apps/web/src/server/entrypoints/functions/rpc-result.ts`, shared core/app RPC utilities

The current server-function `rpcResult()` is close to the generic primitive, but it lives under TanStack server functions and has a boundary-specific name. Extract the generic parts so every structured-clone/network boundary uses the same wire shape.

**Target responsibility:**
- serialize a live `Result<T, E>` into plain data;
- deserialize unknown wire data into `Result<T, E | ResultDeserializationError>`;
- strip methods from static error types so `TaggedError` classes become wire-shaped error data;
- avoid catching panics. A panic before a `Result` exists must still throw.

**Target shape:**
```typescript
type WireResult<T, E> =
  | { status: 'ok'; value: T }
  | { status: 'error'; error: StripMethods<E> }

function serializeResultForWire<T, E>(result: Result<T, E>): WireResult<T, E> {
  return Result.serialize(result) as WireResult<T, E>
}

function deserializeResultFromWire<T, E>(
  wire: unknown,
): Result<T, E | ResultDeserializationError> {
  return Result.deserialize<T, E>(wire)
}
```

**Placement decision:** prefer `packages/core` if browser-safe exports can carry the types cleanly; otherwise keep it app-local in a neutral path such as `apps/web/src/lib/rpc/result-wire.ts`. Do not keep the generic primitive under `server/entrypoints/functions/`.

**Server-function adapter after extraction:**
- `apps/web/src/server/entrypoints/functions/rpc-result.ts` becomes a thin TanStack-specific wrapper or re-export.
- TanStack-specific concerns stay there: Start serializability workaround, inputValidator/middleware behavior, redirect/notFound preservation on the client.

**Tests:**
- serialized ok round-trips;
- serialized tagged err round-trips as plain `_tag` data;
- malformed input returns `Result.err(ResultDeserializationError)`;
- serializer does not swallow a thrown panic from caller-provided work.

## Stage 15: Durable Object RPC Result bridge

**Scope:** future DO callers and `apps/web/src/server/infrastructure/durable-objects/**`

Structured cloning strips prototypes, so DO methods must not return live `Result` instances or TaggedError instances across RPC. DOs should reuse the shared wire primitives from Stage 14, but the caller transport wrapper is DO-specific.

**DO-side helper:**
```typescript
export async function durableObjectResult<T, E>(
  work: () => Promise<Result<T, E>>,
): Promise<WireResult<T, E>> {
  return serializeResultForWire(await work())
}
```

This helper does not catch. If `work()` panics, the DO method throws and the platform/instrumentation sees the bug.

**Caller-side helper:**
```typescript
export async function callDurableObjectResult<T, E>(
  call: () => Promise<unknown>,
): Promise<Result<T, E | DOUnreachableError | ResultDeserializationError>> {
  const transport = await Result.tryPromise({
    try: call,
    catch: (cause) => new DOUnreachableError({ cause }),
  })

  if (transport.isErr()) return transport
  return deserializeResultFromWire<T, E>(transport.value)
}
```

**Use policy:**
- Use this only for DO methods that are part of our typed application/RPC boundary.
- Do not force every DO method to return `Result`. `OutboxRelayDO.trigger()` can remain `Promise<void>` if it is only a best-effort signal.
- Keep `OutboxRelayDO.alarm()` throwing transient relay failures because alarm retry depends on throw.
- Be careful with third-party-owned DO contracts such as better-auth rate limiting; do not change their method shapes unless we own every call site.

**DO transaction/alarm rules:**
- Returning `Err` inside a DO storage transaction commits. Throw at that storage boundary to roll back, then convert back to `Result` outside.
- Returning from `alarm()` means no retry. Throw transient/infrastructure failures out of `alarm()` when retry is desired.

**Tests:**
- DO application method returns serialized ok/err.
- Caller helper maps unreachable DO to `DOUnreachableError`.
- Caller helper maps malformed serialized data to `ResultDeserializationError`.
- Storage transaction Err path rolls back.

## Stage 16: Workflow Result contract

**Scope:** future Cloudflare Workflows

Workflow `step.do()` checkpoints returned values and retries thrown failures. Use the platform contract deliberately:

- Plain success value: return the plain value; no Result serialization needed.
- Permanent/domain failure that downstream steps branch on: return `Result.serialize(Result.err(error))`.
- Transient/infrastructure failure that should retry: throw the TaggedError at the step boundary.
- Mutating external calls must include idempotency keys regardless of inline retry or workflow retry.
- Do not double up broad inline retries with Workflow retries. Inline retry is only for short, idempotent, tightly scoped blips.

**State passing rule:** pass IDs and external handles between steps; re-read domain state inside each step. Snapshot only when point-in-time consistency is a domain requirement.

**Tests:**
- Domain failure returns serialized Err and downstream branch handles it.
- Infrastructure failure throws and is visible to Workflow retry policy.
- Deserialized prior step Result is matched exhaustively.

## Stage 17: Loader and TanStack Query call-site policy

**Scope:** `apps/web/src/routes/**`, `apps/web/src/lib/clients/rpc.ts`, feature hooks/components

Loader policy:
- Do not wrap whole loader bodies in `Result.try`.
- Call Result-returning domain/RPC code inside the loader.
- Translate `EntityNotFoundError` to `throw notFound()` and auth/navigation cases to `throw redirect(...)` at the loader edge.
- Throw unexpected tagged errors to the route `errorComponent` only after expected cases are handled.

Query policy:
- Default server-function mutations to resolved `Result` data so validation/domain errors can render inline.
- For query functions, choose per call site:
  - throw on `Err` when Query error state/error boundaries are the intended UI;
  - return `Result` as data when both branches are meaningful inline.

**Tests:**
- Loader not-found/auth paths preserve TanStack Router behavior.
- Mutation validation error resolves as `Result.err` and renders field errors.
- Network/panic rejection still reaches Query `onError`.

## Queue consumer update (part of Stage 5)

Message bus returns Result for expected failures. Queue consumer handles typed errors via Result. try/catch is panic-only safety net.

```typescript
try {
  const result = await this.messageBus.handle(msg)
  if (result.isErr()) {
    const retryable = 'retryable' in result.error && result.error.retryable === true
    this.handleFailure(message, msg, result.error, retryable)
  } else {
    message.ack()
  }
} catch (error) {
  // True panics only — bugs, not typed errors
  this.handleFailure(message, msg, error, false)
}
```

**Tests:**
- Handler returns `Result.ok()` → message acked
- Handler returns `Result.err({ retryable: true })` → message retried
- Handler returns `Result.err({ retryable: false })` → message acked (DLQ)
- Unknown external routing error (`UnknownMessageTypeError`) → comes as `Result.err()`, not thrown
- Missing internal handler → panic once the Stage 5 follow-up is applied
- True panic → caught by try/catch, not retried

## Notes

- **Scheduled handler** needs a try/catch safety net — now tracked by Stage 12.
