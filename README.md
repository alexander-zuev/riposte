## ⚔️ Riposte

Open-source AI agent that wins your Stripe disputes on autopilot.

### What it does

- Wakes on Stripe dispute webhooks — responds in <60 seconds
- Queries YOUR database for real user activity (not generic Stripe data)
- Builds evidence cases with actual usage stats, screenshots, and timelines
- Generates a structured PDF and submits directly to Stripe
- Self-heals when your schema changes — no hardcoded queries
- Notifies you when a dispute is handled (Slack / Telegram / Discord / Email)

### Why

Most businesses ignore disputes because evidence collection takes 30-60 min per case. Default win rate: ~10-20%. With detailed, app-specific evidence: 50%+.

Chargeflow automates this but charges 25% of recovered revenue and only pulls generic Stripe data. Riposte is free and reads your actual database.

### How it works

```
You deploy Riposte → open the chat UI → agent onboards itself

Agent asks for:
  1. Stripe restricted key (disputes + customer read)
  2. DB connection (PlanetScale / Supabase / Postgres via MCP)
  3. One paragraph about your product

Agent discovers:
  - Your DB schema
  - Where user activity lives
  - What data to pull per dispute

Then runs on autopilot forever.
```

### Architecture

90% deterministic, 10% AI.

```
Stripe webhook (charge.dispute.created)
  |
  [DETERMINISTIC] Pull dispute + charge + customer from Stripe
  [AGENT via MCP] Query merchant DB for user activity
  [DETERMINISTIC] Pull invoice PDF from Stripe
  [DETERMINISTIC] Generate evidence PDF (activity table, screenshots, stats)
  [AI] Generate 3 persuasive text fields
  [DETERMINISTIC] Upload to Stripe, submit evidence
  [DETERMINISTIC] Notify merchant
```

Built on Cloudflare Agents SDK (Think). Each user gets an isolated agent instance with persistent storage and a virtual filesystem.

### Quick start

```bash
git clone https://github.com/alexander-zuev/riposte
cd riposte
# Set your Claude API key
echo "ANTHROPIC_API_KEY=sk-..." > .dev.vars
# Deploy to your Cloudflare account
pnpm install && pnpm deploy
# Open the chat UI and let the agent onboard you
```

### Tech stack

| Layer | What |
|---|---|
| Agent runtime | Cloudflare Workers + Think (Durable Objects) |
| Agent filesystem | @cloudflare/shell (Workspace — SQLite + R2) |
| LLM | Claude via @ai-sdk/anthropic |
| DB access | MCP (PlanetScale, Supabase, Postgres) |
| PDF generation | Deterministic (structured layout, image resize, 5MB limit) |
| Evidence submission | Stripe Disputes API |
| Notifications | Slack / Telegram / Discord / Email |

### License

AGPLv3 — free to use, modify, and self-host. Hosted version coming soon.
