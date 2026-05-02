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

## Key Conventions

- Path aliases: `@web/*` → `src/*`, `@server/*` → `src/server/*`
- Package imports: `@riposte/core` (server), `@riposte/core/client` (browser-safe)
- Formatting: oxfmt. Linting: oxlint. No ESLint/Prettier.
- Secrets: dotenvx-encrypted `.env` files committed to repo. Private keys in `.env.keys` (gitignored).
- All deployments target Cloudflare Workers, never Pages.
