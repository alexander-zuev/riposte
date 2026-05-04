# Refactor: Adopt `better-result`

## Why

Error types are invisible in function signatures. As we add Stripe dispute handlers chaining 3-5 fallible ops, we need typed errors, generator composition, and exhaustive matching.

## Core principles

Handlers never intentionally throw. All expected errors → `Result.err()`. Unexpected errors (bugs) still throw naturally — they're panics. The UoW and middleware catch panics as safety nets.

**What throws (never Result):**
- **Panics** — bugs in code, null derefs, better-result Panic from buggy callbacks. Fix the code.
- **TanStack control flow** — `notFound()`, `redirect()`. Framework machinery, not errors.

**What returns Result:**
- Everything else. Domain errors, infrastructure errors, routing errors. If the caller makes a decision based on error type → Result.
- **AuthenticationError is boundary-specific:** page/navigation flows may redirect; RPC mutation/query flows should usually serialize an auth `Result.err()` so the client adapter can decide whether to redirect, show login UI, or let React Query `onError` handle it. Do not bake "always redirect" into domain/application handlers.

**Reference:** `https://better-result.dev/advanced/serialization#testing-serialization` for serialize/deserialize test patterns.
**opensrc source:** `/home/alexander/.opensrc/repos/github.com/dmmulroy/better-result/2.9.1/`

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
| `NoHandlerError(kind, messageName)` | `TaggedError("NoHandlerError")<{kind: string; messageName: string; message: string; retryable: false}>()` — computed message in constructor |

Union types for grouping (same files):
```typescript
type DomainError = AuthenticationError | AuthorizationError | ValidationError | EntityNotFoundError | RateLimitError
type InfrastructureError = DatabaseError | DuplicateMessageError
type ApplicationError = UnknownMessageTypeError | NoHandlerError
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

Catch block converts `TransactionRollbackError` + stored `handlerErr` back to `Result.err()`. `DuplicateMessageError` from `assertMessageNotProcessed()` still throws — infrastructure idempotency concern, caught by message bus.
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

Message bus returns Result for everything — including routing errors (`UnknownMessageTypeError`, `NoHandlerError`). These are typed errors we recognize, returned as `Result.err()`. The bus no longer throws for routing.

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

## Stage 6: Server functions return serialized Results ✅ IN PROGRESS

**Scope:** `apps/web/src/server/entrypoints/functions/`

**Rule:** server functions are adapters. They receive TanStack input, call application/message-bus code, then return a serialized Result wire object.

We are intentionally not using a generic `resultHandler` wrapper yet. The one extra line is clearer while the pattern is still new:

```typescript
export const joinWaitlist = createServerFn()
  .inputValidator(joinWaitlistInput)
  .handler(async ({ data }) => {
    const bus = new MessageBus(env, { waitUntil })
    const command = createCommand('JoinWaitlist', { email: data.email })
    const result = await bus.handle(command)

    return serializeForRpc(result)
  })
```

`serializeForRpc()` is a TanStack Start type bridge:

```typescript
type RpcWireResult<T> =
  | { status: 'ok'; value: T }
  | { status: 'error'; error: JsonValue }

function serializeForRpc<T, E>(result: Result<T, E>): RpcWireResult<T> {
  return Result.serialize(result) as RpcWireResult<T>
}
```

Why this exists: `Result.serialize(result)` is runtime-correct, and TaggedErrors serialize through `toJSON()`, but TanStack Start's static serializability checker rejects class error types (`DatabaseError`, `ValidationError`, etc.) because they have methods like `[Symbol.iterator]`. We opened upstream issue: https://github.com/TanStack/router/issues/7339.

The bridge preserves the success type and deliberately erases the error side to JSON wire data. Stage 8 client `rpc()` rehydrates with `Result.deserialize<T, E>()`.

**Implemented:**
- Added `JoinWaitlist` command to core message registry.
- Added waitlist command handler.
- `WaitlistRepository.addEmail()` returns `Result`.
- `joinWaitlist` server function dispatches command through `MessageBus` and returns `serializeForRpc(result)`.
- `getSession` returns serialized `Result<AuthSession | null, InternalServerError>`.
- `ensureSession` returns serialized `Result<AuthSession, AuthenticationError | InternalServerError>`.

**`inputValidator` note:** runs before handler — it's TanStack's code. When it fails, TanStack throws a mangled `Error(JSON.stringify(zodIssues))`. `resultHandler` doesn't wrap this. These errors still throw → caught by middleware (Stage 7) → serialized there. Client `rpc()` catch block handles them.

**Status:** app typecheck passing. Client call sites are temporarily bridging raw wire shape until Stage 8 updates `rpc()`.

## Stage 7: Middleware → boundary safety nets ✅ IN PROGRESS

**Scope:** `apps/web/src/server/infrastructure/middleware/error.middleware.ts`

Middleware no longer uses the old `ServerError` wire format. It adapts thrown errors to the current boundary:

- `errorMiddleware` (`type: 'function'`) wraps server functions and throws `serializeForRpc(Result.err(error))`.
- `routeErrorMiddleware` (`type: 'request'`) is explicitly registered on API routes and returns `Response.json(...)`.

They intentionally duplicate the small classification flow instead of hiding it behind an abstraction.

- TanStack router throws (`notFound`, `redirect`) → rethrow
- Function middleware:
  - `AuthenticationError` → serialized auth Result, no redirect
  - Tagged errors → serialized Result
  - Zod parse errors from TanStack's inputValidator → serialized `ValidationError`
  - Unknown panic → log real cause, serialized `InternalServerError`
- Route middleware:
  - `AuthenticationError` → `401 Response.json`
  - `ValidationError` → `400 Response.json`
  - Other tagged errors → mapped status where obvious, otherwise 500
  - Unknown panic → log real cause, `500 Response.json`

API route handlers should still pattern-match expected `Result.err` values themselves. Route middleware is only the outer safety net for leaked thrown errors/panics/framework weirdness.

**Implemented:**
- Added `InternalServerError`.
- Split function vs route error handling.
- Registered `routeErrorMiddleware` on current API routes.

**Tests:**
- Panic thrown → logged, generic error serialized as Result
- `notFound()` thrown → rethrown as-is
- `redirect()` thrown → rethrown as-is
- `AuthenticationError` in function middleware → serialized auth Result
- `AuthenticationError` in route middleware → HTTP 401
- Zod-mangled error → parsed into ValidationError, serialized as Result

## Stage 8: Client `rpc()` → `Result.deserialize()` ✅ REVIEWED

**Scope:** `apps/web/src/lib/clients/rpc.ts`

```typescript
export async function rpc<T, E>(fn: Promise<unknown>): Promise<Result<T, E>> {
  try {
    const raw = await fn
    const result = Result.deserialize<T, E>(raw)
    if (result.isErr() && result.error._tag === 'AuthenticationError') throw redirect({ to: '/' })
    return result
  } catch (error) {
    if (isNotFound(error) || isRedirect(error)) throw error
    // Middleware throws land here (inputValidator Zod errors, panics)
    // They're also Result.serialize'd, so try deserializing
    try { return Result.deserialize<T, E>(error) } catch {}
    return Result.err(error as E)
  }
}
```

**Two paths into `rpc()`:**
1. Server fn returns serialized Result → `try` block deserializes it
2. Middleware throws serialized Result (inputValidator Zod errors, panics) → `catch` block deserializes it

**TanStack Query integration:** `rpc()` returns `Result<T, E>`, never throws for expected errors. TanStack Query's `onSuccess` receives the Result — check `isErr()` there for typed error handling. `onError` only fires for panics/network failures (promise rejections). This correctly separates domain errors (typed, in resolved path) from infrastructure failures (rejected path).

**Note:** `Result.deserialize()` produces plain objects, not TaggedError instances. Use `_tag` string matching on client, not `.is()`. `switch (result.error._tag)` with exhaustive `never` default gives the same compile-time safety as `matchError`.

**Tests:** (ref: `https://better-result.dev/advanced/serialization#testing-serialization`)
- Serialized `Result.ok(val)` → deserializes to `Result.ok(val)`
- Serialized `Result.err(AuthenticationError)` → throws redirect
- Serialized `Result.err(SomeOtherError)` → returns `Result.err(...)` to caller
- Middleware-thrown serialized Result → deserialized in catch block
- Non-Result thrown (network failure) → returns `Result.err(...)`
- `notFound()` / `redirect()` → rethrown, not wrapped

## Stage 9: Client error handling → per-call-site ✅ REVIEWED

**Scope:** `apps/web/src/lib/errors/client.errors.ts`, call sites

Delete centralized `throwServerError()`. Each call site handles its own errors:

```typescript
const result = await rpc<Dispute, NotFoundError | StripeApiError>(getDispute({ data: { id } }))

if (result.isErr()) {
  switch (result.error._tag) {
    case 'NotFoundError': throw notFound()
    case 'StripeApiError': toast.error('Stripe issue, retrying...')
    default: { const _: never = result.error; throw new Error(_.message) }
  }
}
```

Backend uses `matchError` on real TaggedError instances. Client uses `switch (error._tag)` with exhaustive `never` default. Two patterns, each simplest for its context.

No dedicated tests — tested as part of each feature's component/integration tests.

## Stage 10: Delete dead code ✅ REVIEWED

- `base.errors.ts` — entire file (hierarchy classes)
- `types.ts` — `ServerError`, `serializeError()`, `isServerError()` (wire format replaced by `Result.serialize`)
- `api/result.ts` — `Result<T>` type, `ok()` (replaced by better-result's `Result`)
- `client.errors.ts` — `throwServerError()` (replaced by per-call-site handling)

**Tests:** typecheck + existing tests pass. No dead imports remaining (`grep` for removed symbols).

## Queue consumer update (part of Stage 5)

Message bus returns Result for everything. Queue consumer handles all errors via Result. try/catch is panic-only safety net.

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
- Routing error (`UnknownMessageTypeError`) → comes as `Result.err()`, not thrown
- True panic → caught by try/catch, not retried

## Notes

- **Scheduled handler** needs a try/catch safety net — separate task, not part of this migration.
