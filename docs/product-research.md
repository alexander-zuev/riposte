# Product Research

## User

**Indie founders and small SaaS/e-commerce operators on Stripe.** Solo or small team. They handle disputes themselves because they can't afford a dedicated fraud team. Technical enough to self-host or connect APIs, but don't have time to manually fight every chargeback.

Their words: "small business owner", "indie dev", "SaaS founder", "solo founder", "bootstrapped"

## Problem

A customer opens their banking app, taps "dispute charge," and the merchant loses money — even when the customer clearly used the product.

**What actually happens:**

1. Stripe emails you: "A customer has disputed a payment"
2. You have 7-21 days to respond with evidence
3. You open the Stripe dashboard, stare at a form, wonder what to write
4. A bank reviewer — who has never heard of your product — decides in under 60 seconds
5. You lose. Money gone. Plus $15 fee. Contested and lost = $30.

**How bad is it:**

- Each dispute costs $15 minimum, $30 if you contest and lose ([Stripe pricing](https://stripe.com/pricing))
- Default win rate: 10-20% — most merchants don't bother
- "I've easily lost mid-five-figures to disputes over the years in SaaS" — [r/stripe, 18d ago](https://www.reddit.com/r/stripe/comments/1m9xzo5/)
- Visa flags at 0.5% dispute rate, Mastercard at 1.5%. Stripe warns at 0.75%. Fines: $5K-$100K/month. Sustained = card networks terminate you permanently ([Stripe monitoring programs](https://docs.stripe.com/disputes/monitoring-programs))
- "I submitted everything — signed policies, receipts, text messages, photos of the student in my studio... Chase sided with her" — [small business owner, lost $1,225](https://www.reddit.com/r/stripe/comments/1m9xzo5/chargeback_with_proof_she_received_services/)
- "That got me thinking how every single client can basically scam us" — [r/stripe, 20d ago](https://www.reddit.com/r/stripe/)

## Current Solutions (All Broken)

**Ignore it** — Eat the loss. Hope dispute rate stays low. Most common approach.

**Fight manually** — Open dashboard, download data, write a response, upload screenshots, pray. 30-60 minutes per dispute. Evidence is generic. Win rate stays low.

**Stripe Smart Disputes** — Auto-responds using data Stripe already has. 30% of recovered amount. "I can't believe I won a dispute (Stripe Automatic Smart Dispute)" — the surprise says everything.

**Stripe Dispute Prevention (RDR)** — Auto-refunds to avoid disputes. "Stripe Dispute Prevention just refunded $1500 when customer only disputed $200 — now they won't fix it" — [r/stripe](https://www.reddit.com/r/stripe/comments/1l2b82s/)

**Chargeflow** — 25% of recovered revenue. Pulls generic Stripe data only. No access to merchant's database or user activity.

**Chargebacks911 / Sift / Kount** — Enterprise. Expensive. Months to onboard. Overkill for small operators.

**The gap they all share:** They only see what Stripe sees — payment data, timestamps, card info. None of them answer the bank's actual question.

## The Insight

The bank reviewer asks one question: **"Did this person get what they paid for?"**

A Stripe receipt doesn't answer that. Your app's data does:

- User signed up Jan 3, generated 847 images over 4 months, last active 2 days before dispute
- 142 sessions, 23 hours of usage, never contacted support, never requested a refund
- 6 screenshots of actual content they created

That's not a payment record. That's a case.

**What winners actually do** (from threads where merchants won):

- "I gathered all relevant information and used ChatGPT to help me structure my evidence into one big document" — [won a high-ticket dispute](https://www.reddit.com/r/stripe/comments/1o0c5dt/)
- Winning evidence: "Proof of service delivery (3+ pages), Proof of client acknowledgement, Reviewer Summary & Exhibit Index"
- "Always relate the evidence back to the customer's claim"

**Pattern:** People who win invest hours building structured, app-specific evidence. People who lose submit generic Stripe data.

Levelsio (Interior AI) proved this at scale — went from losing every dispute to winning them, including a $1,199 case — by pulling real user activity from his database. But he built custom PHP scripts hardcoded to his app.

## What Stripe Needs (Evidence Spec)

### One-time setup (onboarding)

| Field                            | Type | Source                                                 |
| -------------------------------- | ---- | ------------------------------------------------------ |
| `product_description`            | Text | Founder describes product once                         |
| `refund_policy_disclosure`       | Text | "Displayed during checkout, accessible at /legal"      |
| `cancellation_policy_disclosure` | Text | "Shown during checkout, cancel anytime from /settings" |
| `refund_policy`                  | File | Static policy PDF                                      |
| `cancellation_policy`            | File | Static policy PDF                                      |

### Auto-generated per dispute

| Field                    | Type | Source                                                                           |
| ------------------------ | ---- | -------------------------------------------------------------------------------- |
| `customer_name`          | Text | Stripe customer object                                                           |
| `customer_email_address` | Text | Stripe customer object                                                           |
| `service_date`           | Text | Stripe charge object                                                             |
| `receipt`                | File | Stripe invoice PDF                                                               |
| `access_activity_log`    | Text | Merchant DB + Stripe — signup, actions, last active, plan, total paid            |
| `service_documentation`  | File | Generated PDF: customer info, usage summary, activity table, up to 6 screenshots |

### AI-generated per dispute (3 fields)

| Field                        | Type | What the AI writes                                                                                    |
| ---------------------------- | ---- | ----------------------------------------------------------------------------------------------------- |
| `uncategorized_text`         | Text | The argument: "User signed up Jan 3, used for 4 months, generated 847 photos, never requested refund" |
| `refund_refusal_explanation` | Text | Why no refund — "never asked" vs "asked after dispute" vs "exceeded policy window"                    |
| `cancellation_rebuttal`      | Text | Prove they used it — references actual activity dates and counts                                      |

## Why an Agent, Not a SaaS

Chargeflow is a SaaS. You connect Stripe, they pull payment data, generate generic responses.

An agent is fundamentally different:

- **Reads your codebase** — understands your schema, what data exists
- **Queries your DB** — pulls actual user activity (signups, actions, timestamps)
- **Reads your logs** — builds activity timelines
- **Accesses your storage** — grabs actual screenshots/deliverables the user received
- **Writes to Stripe** — submits evidence via Disputes API

The evidence quality is 10x because it's app-specific, not generic.

## Why Screenshots Matter

Screenshots = proof the customer received something. The bank reviewer scans a PDF in 30 seconds. Images are undeniable.

- **SaaS:** Screenshots of their dashboard, activity, generated content
- **E-commerce:** Order confirmation, delivery photos, tracking
- **Courses:** Completed lessons, progress screenshots
- **AI tools:** The actual outputs they generated (levelsio's winning move)

Stripe doesn't technically require them. But they massively increase win rate because they answer the bank's core question: "Did this person get what they paid for?"

## How Riposte Works

### Product flow

```
ONBOARDING (5 min, once)
├── Connect Stripe (OAuth)
├── Connect data source (DB read-only access)
├── Describe your product (1 paragraph)
├── Upload/link refund + cancellation policy
└── Agent discovers your schema, finds user activity tables

AUTOPILOT (every dispute, forever)
├── Webhook fires → agent wakes up
├── Pulls customer from Stripe
├── Queries YOUR DB/logs for that user's activity
├── Pulls screenshots/deliverables from YOUR storage
├── Generates evidence text + PDF
├── Submits to Stripe in <60 seconds
└── Notifies you (Slack/Telegram/Discord/Email)

LEARNING (v2)
├── Review win/loss → agent learns what evidence wins
├── Tweak prompt for dispute patterns
└── Add new evidence sources as app evolves
```

### Architecture — 90% deterministic, 10% AI

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

No hallucinated evidence. AI writes three persuasive text fields. Everything else — data collection, PDF generation, Stripe submission — is deterministic code.

### Tech stack

| Layer               | What                                                       |
| ------------------- | ---------------------------------------------------------- |
| Agent runtime       | Cloudflare Workers + Durable Objects                       |
| Agent filesystem    | SQLite + R2                                                |
| LLM                 | Claude via @ai-sdk/anthropic                               |
| DB access           | MCP (Postgres, MySQL, SQLite)                              |
| PDF generation      | Deterministic (structured layout, image resize, 5MB limit) |
| Evidence submission | Stripe Disputes API                                        |
| Notifications       | Slack / Telegram / Discord / Email                         |

Cloudflare-native with DDD adapters. Anyone can write adapters for Vercel, Railway, AWS — but the CF version is canonical.

**vs. manual:** Hours per dispute → under 60 seconds.
**vs. Chargeflow:** 25% fee, generic data → free, your actual data.
**vs. Stripe Smart Disputes:** 30% fee, same generic data → free, app-specific evidence.

## Competitive Landscape

| Product               | What                                 | Gap                                         |
| --------------------- | ------------------------------------ | ------------------------------------------- |
| Chargeflow            | AI auto-dispute, 25% of won          | Generic evidence — no DB access             |
| Chargebacks911        | Enterprise chargeback mgmt           | Enterprise only, expensive, manual          |
| Midigator (Kount)     | Dispute automation                   | Enterprise, payment processor focused       |
| Sift                  | Fraud + disputes                     | Enterprise suite, overkill for SMBs         |
| Stripe Smart Disputes | Auto-respond with Stripe data        | 30% fee, same generic data                  |
| Levelsio DIY          | Custom PHP scripts per app           | Not a product — manual setup per app        |
| **Riposte**           | **Agent with app-specific evidence** | **The only tool that reads your actual DB** |

## Ubiquitous Language

| Their word               | What they mean                                                      |
| ------------------------ | ------------------------------------------------------------------- |
| chargeback               | dispute (used interchangeably)                                      |
| evidence                 | documents/screenshots/text submitted to fight a dispute             |
| dispute rate             | % of transactions disputed — the metric that can kill your business |
| friendly fraud           | customer received the product but disputes anyway                   |
| "product not received"   | most common false dispute reason code                               |
| "subscription cancelled" | second most common false reason code                                |
| Chase                    | the issuing bank merchants hate — "I never won a case with Chase"   |
| $15 fee                  | Stripe dispute fee, charged even if you win                         |
| monitoring program       | Visa/Mastercard penalty program for high dispute rates              |

## Validation

- Levelsio (Interior AI) shared his full auto-dispute system publicly — massive viral engagement, proved the approach works
- Tibo built the same thing for Revid in 1 hour, winning disputes
- @indiesoftwaredv winning disputes with Claude-prepared documents
- Andre Baltazar built the same for PayPal
- Lenny Rachitsky: "I need this"
- Peter Yang: "can you open source this?"
- Bram (@Bram_SaaS): "Market this as an app it's a no brainer I need this for apps doing volume"

## Deep Research Insights

### The dispute process is rigged against merchants

The issuing bank (Chase, AMEX, etc.) decides everything. Stripe has no say. The bank already gave the customer a temporary credit, so they have zero incentive to side with you. The first time a neutral third party looks at evidence is arbitration — which costs $400-$600 and Stripe almost never escalates to. ([Unfair disputes thread](https://www.reddit.com/r/stripe/comments/1rlyox0/unfair_disputes_are_ruining_businesses/))

"The system's so broken — they basically get to play judge, jury, and executioner the whole way through until arbitration." — immigration lawyer in the same thread

### AMEX disputes are structurally different

With Visa/Mastercard, the issuing bank makes the decision. With AMEX, American Express is both the card network AND the issuer — they evaluate and decide as the same entity. AMEX's brand is built on cardholder protection. Win rates against AMEX are consistently lower. "I recently had to deal with a 1k chargeback... Customer used it for 11 months and disputed it. Stripe gave their money back despite all the usage logs." ([Stripe dispute team is useless](https://www.reddit.com/r/stripe/comments/1skgiix/stripe_dispute_team_is_useless/))

AMEX reviewers respond better to a single clear document that walks through a timeline rather than scattered attachments. Usage logs beat contracts for service businesses.

### Smart Disputes fail because they assume minimal evidence works

"I went with Stripe's recommendation of 'Smart Dispute' with minimal proof attached and that got rejected, then when I learned from a friend that I need to provide all the details, I spent 3 days accumulating all the proof" — [Unfair disputes thread](https://www.reddit.com/r/stripe/comments/1rlyox0/unfair_disputes_are_ruining_businesses/)

Banks don't operate with minimal evidence. They want comprehensive, timestamped, clearly-organized proof. Smart Disputes submit the bare minimum.

### The real problem is mobilizing evidence, not having it

"The real issue isn't that you lacked proof. It's that you couldn't mobilize it fast enough." Most merchants have the evidence scattered across systems — Stripe dashboard, database, email threads, screenshots. When a dispute hits, they spend days manually pulling, organizing, and formatting. By then it's too late or too exhausting.

### What actually wins disputes (from people who won)

1. Evidence ready before disputes happen, not after
2. A single structured document — not scattered attachments
3. Speed — submitting within hours, not days
4. Usage logs with timestamps showing the customer actively used the product
5. Relating evidence directly to the customer's specific claim
6. "I gathered all relevant information and used ChatGPT to help me structure my evidence into one big document" — [won a high-ticket dispute](https://www.reddit.com/r/stripe/comments/1o0c5dt/)

### The $15 fee is salt in the wound

"PSA: Accepting a Stripe dispute still costs you $15" — you pay even if you don't contest. Contest and lose = $30. This fee alone discourages fighting small disputes, which trains merchants to accept losses. ([PSA thread](https://www.reddit.com/r/stripe/comments/1so7dfa/))

### Chargeflow appears as astroturf in dispute threads

In the $5k chargeback thread (likely AI-generated), a suspicious comment appeared: "heard about chargeflow lately its this ai thing that automates fighting them" — formatted differently from organic comments, reads like planted marketing. The community called it out as AI-generated content. This tells us the market is actively being targeted by competitors.

## Sources

- [r/stripe](https://www.reddit.com/r/stripe/) — 31K weekly visitors, primary community
- [Chargeback with PROOF she received services](https://www.reddit.com/r/stripe/comments/1m9xzo5/) — $1,225 lost despite full evidence
- [Won my first high ticket dispute](https://www.reddit.com/r/stripe/comments/1o0c5dt/) — ChatGPT-structured evidence won
- [Stripe Dispute Prevention refunded $1500](https://www.reddit.com/r/stripe/comments/1l2b82s/) — Stripe's own tools backfire
- [Stripe dispute team is useless](https://www.reddit.com/r/stripe/) — "lost mid-five-figures" (18d ago)
- [Unfair disputes are ruining businesses](https://www.reddit.com/r/stripe/) — 46 comments, 2mo ago
- [Stripe monitoring programs](https://docs.stripe.com/disputes/monitoring-programs) — official escalation rules
- [Stripe pricing](https://stripe.com/pricing) — $15 dispute fee
- Levelsio's public dispute system — origin of the approach
