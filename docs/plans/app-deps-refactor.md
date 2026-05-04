# Refactor: App Deps / Per-Entrypoint Container

## Goal

Create a consistent dependency factory for every Cloudflare entrypoint without using a global singleton.

Each request/alarm/queue/workflow/DO instance should get a small `deps` object from:

```ts
createAppDeps(env, ctx)
```

Then application code receives explicit dependencies instead of importing Cloudflare globals or constructing deep infrastructure objects ad hoc.

## Why

- Avoid global mocks and test leakage.
- Make handler tests easier: pass fake deps instead of mocking imported constructors.
- Keep entrypoints thin and consistent.
- Centralize real production wiring in one place.
- Prepare for more handlers/repos/services without prop-drilling every dependency manually.

## Shape

Draft shape:

```ts
type AppDeps = {
  env: Env
  ctx: Pick<ExecutionContext, 'waitUntil'>

  get db(): DrizzleDb

  repos: {
    outbox: (tx: DrizzleDb) => IOutboxRepository
    waitlist: (tx: DrizzleDb) => IWaitlistRepository
  }

  services: {
    queueClient: () => IQueueClient
    outboxRelay: () => OutboxRelay
    messageBus: () => MessageBus
  }
}
```

Use lazy getters/factories for dependencies that may not be used by every request. Do not create 100 services eagerly.

## Entrypoint Pattern

Worker/server function/queue/scheduled:

```ts
const deps = createAppDeps(env, ctx)
await deps.services.messageBus().handle(command)
```

Durable Objects:

```ts
export class SomeDO extends DurableObject {
  private readonly deps: AppDeps

  constructor(state: DurableObjectState, env: Env) {
    super(state, env)
    this.deps = createAppDeps(env, { waitUntil: state.waitUntil.bind(state) })
  }
}
```

Exact DO lifecycle API needs checking before implementation.

## What Moves

Eventually:

- `MessageBus` receives deps or handler registries built from deps.
- UoW receives db/outbox repo factory/relay trigger through deps.
- Outbox relay receives `IQueueClient` and repo/db from deps.
- Handlers use deps/repo factories instead of `new Repo(tx)` directly.

## What Does Not Move

- Domain objects stay dependency-free.
- Pure schemas/factories stay in core.
- Framework control flow still belongs at entrypoints.

## Testing Impact

Before:

```ts
vi.mock('@server/infrastructure/repositories/outbox.repository')
```

After:

```ts
const deps = createTestDeps({
  repos: { outbox: () => fakeOutboxRepo },
})
```

This reduces module mocks and makes tests less global-state-sensitive.

## Open Decisions

- Exact `AppDeps` shape.
- Whether `MessageBus` receives deps directly or prebuilt handler maps.
- Whether repository interfaces should be added for all repos before migration.
- Durable Object dependency initialization pattern.

## When To Do It

Not in the middle of better-result Stage 8 unless needed.

Recommended order:

1. Finish client `rpc()` Result deserialization.
2. Delete old wire error helpers.
3. Introduce `createAppDeps` for one vertical slice: waitlist + message bus + UoW.
4. Expand gradually.
