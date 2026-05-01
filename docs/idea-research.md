# 003: AI Stripe Dispute Agent (Open-Source)

**Status:** BUILDING
**Date started:** 2026-04-30
**Priority:** HIGH — ship ASAP, window is open NOW
**Repo:** github.com/alexander-zuev/riposte (private, will go public at launch)
**License:** AGPLv3

## One-liner

Open-source AI agent that auto-responds to Stripe chargebacks with hyper-specific evidence from your app's DB, logs, and storage. Runs on autopilot. Submits evidence in <60 seconds. Network effect moat from cross-merchant fraud intelligence.

## Origin

Levelsio (Interior AI) shared his entire auto-dispute system publicly. He went from never winning disputes to winning them — including a $1,199 dispute — because the evidence is detailed and app-specific. He shared the full prompt/spec. The insight: **detailed, app-specific evidence submitted instantly and automatically wins disputes that generic responses lose.**

## Problem

- US buyers abuse chargebacks — one tap in their banking app to get free stuff
- Most businesses ignore disputes because manual evidence collection takes hours per dispute
- Default win rate ~10-20%. With good evidence: 50%+
- Every dispute costs $15 fee. Contest and lose = another $15. That's $30 per lost dispute ([Stripe pricing](https://stripe.com/pricing))
- Stripe recommends staying below 0.75% dispute rate. Visa flags at 0.5%, Mastercard at 1.5%. Exceed for too long → escalating fines ($5K-$100K/mo), and ultimately card networks refuse to process your payments ([Stripe: monitoring programs](https://docs.stripe.com/disputes/monitoring-programs))
- Stripe's own "Smart Disputes" takes 30% of recovered amount — positioning themselves as the solution to the problem they charge you for
- Existing tools (Chargeflow, Chargebacks911) pull generic Stripe data. They don't have access to your app's DB/logs/storage — so the evidence is shallow.

## Why an agent, not a SaaS dashboard

Chargeflow is a SaaS. You connect Stripe, they pull payment data, generate generic responses.

An agent is fundamentally different:

- **Reads your codebase** — understands your schema, what data exists
- **Queries your DB** — pulls actual user activity (signups, actions, timestamps)
- **Reads your logs** — builds activity timelines
- **Accesses your storage** — grabs actual screenshots/deliverables the user received
- **Writes to Stripe** — submits evidence via disputes API

The evidence quality is 10x because it's app-specific, not generic.

## What Stripe needs (evidence spec)

### One-time setup (onboarding, 5 min)

| Field                            | Type        | Source                                                 |
| -------------------------------- | ----------- | ------------------------------------------------------ |
| `product_description`            | Text        | Founder describes product once                         |
| `refund_policy_disclosure`       | Text        | "Displayed during checkout, accessible at /legal"      |
| `cancellation_policy_disclosure` | Text        | "Shown during checkout, cancel anytime from /settings" |
| `refund_policy`                  | File upload | Static policy PDF                                      |
| `cancellation_policy`            | File upload | Static policy PDF                                      |

### Auto-generated per dispute (agent pulls from APIs)

| Field                    | Type        | Source                                                                                                                                       |
| ------------------------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `customer_name`          | Text        | Stripe customer object                                                                                                                       |
| `customer_email_address` | Text        | Stripe customer object                                                                                                                       |
| `service_date`           | Text        | Stripe charge object (Y-m-d)                                                                                                                 |
| `receipt`                | File upload | Stripe invoice PDF (`invoice->invoice_pdf` URL)                                                                                              |
| `access_activity_log`    | Text        | DB + logs + Stripe — signup date, actions done, last active, plan, total paid, recent activity with timestamps                               |
| `service_documentation`  | File upload | Generated PDF: customer info, usage summary, activity table, up to 6 actual product screenshots (resized to 500px wide, JPEG q75, under 5MB) |

### AI-generated per dispute (agent + prompt, varies per case)

| Field                        | Type | What the AI writes                                                                                    |
| ---------------------------- | ---- | ----------------------------------------------------------------------------------------------------- |
| `uncategorized_text`         | Text | The argument: "User signed up Jan 3, used for 4 months, generated 847 photos, never requested refund" |
| `refund_refusal_explanation` | Text | Why no refund — "never asked" vs "asked after dispute" vs "exceeded policy window"                    |
| `cancellation_rebuttal`      | Text | Prove they used it — references actual activity dates and counts                                      |

### Screenshots — why they matter

Screenshots = proof the customer received something. The bank reviewer scans a PDF in 30 seconds. Images are undeniable.

- **SaaS:** Screenshots of their dashboard, activity, generated content
- **E-commerce:** Order confirmation, delivery photos, tracking
- **Courses:** Completed lessons, progress screenshots
- **AI tools:** The actual outputs they generated (levelsio's winning move)

Stripe doesn't technically require them. But they massively increase win rate because they answer the bank's core question: "Did this person get what they paid for?"

## Product Flow

```
ONBOARDING (5 min, once)
├── Connect Stripe (OAuth)
├── Connect data source (repo/DB read access OR SDK)
├── Describe your product (1 paragraph)
├── Upload/link refund + cancellation policy
└── Tell us where user activity lives (table/log path, or agent figures it out)

AUTOPILOT (every dispute, forever)
├── Webhook fires → agent wakes up
├── Pulls customer from Stripe
├── Queries YOUR DB/logs for that user's activity
├── Pulls screenshots/deliverables from YOUR storage
├── AI generates evidence text + PDF
├── Submits to Stripe in <60 seconds
└── Notifies you (Slack/Telegram/email)

MAINTENANCE (v2, optional)
├── Review win/loss → agent learns what evidence wins
├── Tweak prompt for dispute patterns
└── Add new evidence sources as app evolves
```

## Tech Stack

| Layer              | What                                                            | Cost     |
| ------------------ | --------------------------------------------------------------- | -------- |
| Agent runtime      | Cloudflare Workers / Durable Objects                            | $5-25/mo |
| Stripe integration | Stripe API (webhooks + disputes + files)                        | Free     |
| DB access          | Read-only connection to customer's DB (Postgres, MySQL, SQLite) | Free     |
| PDF generation     | FPDF or Puppeteer for rich PDFs                                 | Free     |
| Image processing   | Sharp/GD — resize screenshots to fit 5MB limit                  | Free     |
| Storage            | R2 for evidence PDFs                                            | Pennies  |
| LLM                | Claude/GPT for evidence text generation                         | $5-20/mo |
| Notifications      | Slack webhook / Telegram bot / email                            | Free     |

## Business Model

**This is NOT the revenue product. This is the audience builder.**

- Open-source, AGPLv3, free to self-host
- No hosted version (for now)
- No community PRs — issues only, my repo, my rules
- Goal: GitHub stars, HN frontpage, Twitter followers, credibility
- Revenue comes later from ReturnHawk (closed-source, paid)

**Why open-source:**

1. Nothing proprietary — levelsio shared the full spec publicly
2. Zero audience today — OSS builds it
3. Lenny Rachitsky said "I need this." Peter Yang asked "can you open source this?" Demand is public and literal.
4. Chargeflow charges 25% — free open-source alternative gets instant attention
5. Cloudflare-native with DDD adapters = anyone can port, but CF version is best = free marketing
6. The "secret sauce" doesn't exist — it's webhook + DB query + PDF generation + a sprinkle of AI reasoning for persuasive text

## Competitive Landscape

| Company               | What                                                                    | Gap                                                   |
| --------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| **Chargeflow**        | AI auto-dispute, 25% of won                                             | Generic evidence — no DB/log access. SaaS, not agent. |
| **Chargebacks911**    | Enterprise chargeback mgmt                                              | Enterprise only, expensive, manual                    |
| **Midigator (Kount)** | Dispute automation                                                      | Enterprise, payment processor focused                 |
| **Sift**              | Fraud + disputes                                                        | Enterprise suite, overkill for SMBs                   |
| **Levelsio DIY**      | Custom PHP scripts per app                                              | Not a product — manual setup per app                  |
| **Us**                | **Open-source agent with app-specific evidence + network intelligence** | **The only tool that reads your actual codebase/DB**  |

Key difference: Chargeflow pulls Stripe data. We pull YOUR data. That's why the evidence is 10x better.

## Why Build This First (Before ReturnHawk)

1. **Faster to validate** — every Stripe business is a potential customer (not just Amazon sellers)
2. **Faster to build** — Stripe API is clean, well-documented, no SP-API approval process
3. **Open-source gets distribution** — HN, Reddit, Twitter. Levelsio already proved the demand publicly.
4. **Revenue from day 1** — commission on won disputes = immediate monetization
5. **Same moat pattern** — cross-merchant fraud intelligence = network effect, same as ReturnHawk's cross-seller database
6. **Skills transfer** — fraud detection + evidence generation + persistence through denials = same muscles as ReturnHawk

## Architecture

**90% deterministic, 10% AI.**

```
Stripe webhook (charge.dispute.created)
  │
  ├── [DETERMINISTIC] Pull dispute + charge + customer from Stripe API
  ├── [DETERMINISTIC] Query merchant DB for user activity (schema-aware)
  ├── [DETERMINISTIC] Pull invoice PDF from Stripe
  ├── [DETERMINISTIC] Pull screenshots/deliverables from storage
  ├── [DETERMINISTIC] Generate evidence PDF (user info, activity table, images)
  ├── [AI — 10%] Generate persuasive text for uncategorized_text,
  │                cancellation_rebuttal, refund_refusal_explanation
  ├── [DETERMINISTIC] Upload files to Stripe, submit evidence
  └── [DETERMINISTIC] Notify via Slack/Telegram/email
```

**Cloudflare-native, DDD with adapters:**

- Workers for webhook handler + API
- Durable Objects or Queues for reliable processing
- D1 for dispute tracking
- R2 for evidence PDF storage
- Adapters for: DB (SQLite/Postgres), storage (R2/S3), notifications (Slack/Telegram/email)
- Anyone can write adapters for Vercel, Railway, AWS, etc.

## Validation

### Already validated (publicly, today)

- Levelsio shared system + results, massive viral engagement
- Tibo built same thing for Revid in 1 hour, winning disputes
- @indiesoftwaredv winning disputes with Claude-prepared documents
- Andre Baltazar built same for PayPal
- Lenny Rachitsky: "I need this"
- Peter Yang: "can you open source this?"
- Multiple people tagging Chargebacks911 and Chargeflow = incumbents feeling heat
- Bram (@Bram_SaaS): "Market this as an app it's a no brainer I need this for apps doing volume"

### Risk

- **Someone else ships the OSS version first.** Levelsio posted hours ago. Window is closing.

## Next Actions

1. **NOW:** Create public GitHub repo, scope MVP
2. **This week:** Build core — webhook → evidence collection → PDF generation → Stripe submit
3. **This week:** Test with Stripe test mode (tok_createDispute)
4. **Ship:** Post to HN, Twitter, Reddit
5. **Then:** ReturnHawk (the real business)
