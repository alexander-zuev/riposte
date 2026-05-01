# Launch Thread

## Post 1 — Hook

I took @levelsio's Stripe auto-dispute idea and turned it into an open-source agent you can connect to any project.

It onboards itself. You give it read-only access to your DB, Stripe, and logs — it figures out the rest.

Runs on Cloudflare. Open-source.

[demo video / screenshot of agent chat during onboarding]

## Post 2 — How it works

Here's what happens when a customer disputes a charge:

1. Stripe webhook fires → Riposte wakes up
2. Reads your DB for that user's actual activity (signups, actions, timestamps)
3. Pulls invoice, customer details, charge data from Stripe
4. Generates a PDF with real evidence — usage stats, screenshots, activity timeline
5. Submits evidence to Stripe in <60 seconds
6. Notifies you in Slack / Telegram / Discord / Email

No manual work. No copy-pasting into Stripe dashboard.

## Post 3 — Why this is different

Levelsio built custom PHP scripts hardcoded to his app. Works great — for him.

Riposte is an agent. You don't write integration code. You give it access and it discovers:

- Your DB schema — what tables exist, where user activity lives
- Your data patterns — signups, actions, timestamps, deliverables
- Your product context — what the customer actually received

Your schema changes? Riposte adapts. New tables? It finds them. That's the difference between a script and an agent.

Chargeflow charges 25% of recovered revenue and only pulls generic Stripe data. Riposte is free and pulls YOUR data.

## Post 4 — Security & access

You control exactly what Riposte sees:

- Stripe: restricted API key — you set the scopes (disputes + customer data only)
- DB: read-only connection via MCP — it queries, never writes
- Logs: scoped by the token you provide
- Notifications: you choose the channel

The agent can't do anything you didn't explicitly allow.

## Post 5 — Setup

5 minutes:

```
git clone riposte → wrangler deploy → open chat UI
```

The agent asks you:

- "What's your Stripe key?"
- "How do I connect to your DB?"
- "Tell me about your product"

It discovers your schema, writes its own playbook, and starts handling disputes.

No config files. No integration code. The agent IS the setup wizard.

## Post 6 — CTA

Self-host it for free. Or use the hosted version if you don't want to deal with infra.

If you're on Stripe and losing disputes — this is for you.

[repo link] | [hosted — riposte.sh]

---

# README

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

Exceed 0.75% dispute rate and Stripe flags you. Stay above Visa's 0.5% or Mastercard's 1.5% threshold and card networks escalate fines from $5K to $100K/month — and eventually refuse to process your payments entirely.

But collecting evidence takes hours per dispute, so most businesses just eat the loss. Every dispute costs $15. Contest and lose = $30. Stripe's own "Smart Disputes" takes 30% of recovered revenue.

Riposte is free, open-source, and reads your actual database — not just generic Stripe data like Chargeflow (25% of recovered).

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

| Layer               | What                                                       |
| ------------------- | ---------------------------------------------------------- |
| Agent runtime       | Cloudflare Workers + Think (Durable Objects)               |
| Agent filesystem    | @cloudflare/shell (Workspace — SQLite + R2)                |
| LLM                 | Claude via @ai-sdk/anthropic                               |
| DB access           | MCP (PlanetScale, Supabase, Postgres)                      |
| PDF generation      | Deterministic (structured layout, image resize, 5MB limit) |
| Evidence submission | Stripe Disputes API                                        |
| Notifications       | Slack / Telegram / Discord / Email                         |

### License

AGPLv3 — free to use, modify, and self-host. Hosted version coming soon.
