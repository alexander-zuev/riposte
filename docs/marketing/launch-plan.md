# Launch Plan

Goal: get first paying users with active/recent Stripe disputes.

## Core Offer

> Fighting a Stripe dispute? Send Riposte the dispute + app usage data. It turns them into submitted Stripe evidence.

Lead with one concrete outcome, not a broad automation platform.

## Launch Assets

- Product demo video: dispute arrives -> app evidence found -> packet generated -> submitted/escalated.
- Simple landing page with one CTA: get one dispute packet.
- Stripe Payment Link / Checkout for one-off packet or plan.
- Open-source repo angle: inspectable, self-hostable, no 25% recovery tax.

## Primary Channels

1. **Direct outbound**
   - List SaaS/AI tools with Stripe checkout.
   - Target founders/operators.
   - Message around active pain: "If you get disputes, I can turn usage logs into Stripe-ready evidence."

2. **Reddit pain search**
   - Search `r/stripe`, `r/SaaS`, `r/ecommerce`, `r/smallbusiness`.
   - Keywords: `Stripe dispute`, `chargeback`, `lost dispute`, `Stripe held funds`, `unfair dispute`.
   - Reply with useful tactical advice, then offer one packet.

3. **X / Twitter**
   - Launch thread around Levels/Tibo -> open-source reusable agent.
   - Reply under Levels/Tibo threads and quote tweets.
   - Search for founders complaining about Stripe disputes and DM a one-dispute offer.

4. **HN / open-source launch**
   - `Show HN: Open-source agent that builds Stripe dispute evidence from your app data`.
   - Use for credibility and developer trust, not as the only sales channel.

5. **SEO content**
   - "How to win a Stripe dispute with app usage logs"
   - "Stripe dispute evidence template for SaaS"
   - "How to respond to product_not_received disputes for digital goods"
   - "Levels.io Stripe dispute responder, generalized"

## Paid Test

Run minimal X + Reddit ads after the demo video exists.

- Budget: small daily cap per channel.
- Use anon/clean Riposte accounts.
- Creative: Remotion video showing the real product flow, not abstract AI graphics.
- Target message: "Your app already has the evidence Stripe needs."
- Measure: CTR, email/demo conversion, uploaded dispute, paid packet.

## Lower Priority

- Product Hunt: awareness, not first buyers.
- Betalist: likely low buyer intent.
- Broad AI directories: only after the core demo and paid offer are live.

---

# Draft Launch Thread

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

## 🤺 Riposte

Open-source AI agent that wins your Stripe disputes on autopilot.

### What it does

- Wakes on Stripe dispute webhooks — responds in <60 seconds
- Queries YOUR database for real user activity (not generic Stripe data)
- Builds evidence cases with actual usage stats, screenshots, and timelines
- Generates a structured PDF and submits directly to Stripe
- Self-heals when your schema changes — no hardcoded queries
- Notifies you when a dispute is handled (Slack / Telegram / Discord / Email)

### Why

**Disputes are existential.** Exceed 0.75% dispute rate and card networks flag you. Fines escalate from $5K to $100K/month. Stay too long and Visa/Mastercard refuse to process your payments — permanently.

**But fighting them is a losing game.** Collecting evidence takes hours per case. Every dispute costs $15, contest and lose = $30. Most businesses just eat the loss. Default win rate: ~10-20%.

**Existing tools can't help.** Stripe's Smart Disputes, Chargeflow, Chargebacks911 — they all pull generic payment data. None of them can access your app's database, user activity logs, or the actual product your customer received. That's why the evidence is shallow and win rates stay low.

**Riposte reads your actual data.** It queries your database for real user activity, pulls screenshots of what they received, and builds evidence that answers the only question the bank cares about: _"Did this person get what they paid for?"_

### How it works

**Cloud** — 1-click setup at [riposte.sh](https://riposte.sh). Connect Stripe, connect your DB, done.

**Self-hosted** — deploy to your own Cloudflare account:

```bash
git clone https://github.com/alexander-zuev/riposte
pnpm install && pnpm deploy
```

Both use the same agent. On first run, it onboards itself:

```
1. CONNECT     Stripe key + DB connection + describe your product
                          ↓
2. DISCOVER    Agent reads your schema, finds user activity tables
                          ↓
3. AUTOPILOT   Webhook fires → pulls evidence → generates PDF → submits to Stripe
                          ↓
4. NOTIFY      Slack / Telegram / Discord / Email
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
