# Product Research

Riposte is an open-source AI agent that fights Stripe disputes — pulls real usage evidence from the merchant's own systems, builds a case, submits it to Stripe, and wins disputes that merchants currently lose because they can't mobilize their own data fast enough.

## Context — How Disputes Work

Online payments flow through four parties: the **cardholder** (customer), their **issuing bank** (Chase, AMEX, etc.), the **card network** (Visa, Mastercard, AMEX), and the **acquirer** (Stripe, on behalf of the merchant). When a customer pays, money moves from issuer → network → acquirer → merchant.

A **dispute** (also called a chargeback) happens when a cardholder questions a payment with their issuing bank. The bank immediately reverses the charge — money leaves the merchant's account before anyone investigates. The merchant then has **7-21 days** to submit evidence proving the transaction was legitimate (**representment**). After submission, the cardholder's bank reviews evidence — takes up to **75 days** to decide. Three merchant options: submit evidence, accept dispute, or do nothing (= auto-lose). Chargebacks are projected to increase 24% globally from 2025 to 2028, totalling 324 million transactions each year ([Stripe](https://stripe.com/guides/introduction-to-payment-disputes)).

**Withdrawn disputes** still require evidence — many issuers treat no evidence as acceptance of liability even after withdrawal. Agent must always submit ([Stripe](https://docs.stripe.com/disputes/withdrawing)).

**Dispute categories** ([Stripe](https://stripe.com/guides/introduction-to-payment-disputes)): fraudulent, product not received, product unacceptable, subscription cancelled, credit not processed, duplicate, general.

The **issuing bank** decides the outcome, not Stripe ([how disputes work](https://docs.stripe.com/disputes/how-disputes-work), [representment explained](https://stripe.com/resources/more/representment-explained)). Stripe is the acquirer — they pass evidence through but have no decision-making power. If the issuer's decision is contested, it escalates to the card network whose ruling is final and binding.

If the merchant loses representment, the next step is **pre-arbitration** (still decided by the issuer). After that comes **arbitration** — the first time a neutral party reviews the case — but it costs $400-$600 and Stripe almost never escalates to it.

**Fees ([Stripe pricing](https://stripe.com/pricing), [dispute fees FAQ](https://support.stripe.com/questions/dispute-fees-faq)):** Two separate fees — a **dispute received fee** (charged when opened, non-refundable) and a **dispute countered fee** (charged if you submit evidence, refunded if you win). US: $15 each.

**Dispute rates** are tracked per card network, not globally. Every dispute increases your rate — win or lose. Visa flags at 0.5% ([dropped threshold to 0.9% in Jan 2026](https://www.reddit.com/r/SaaS/comments/1p19ech/i_analyzed_hundreds_of_suspended_stripe_accounts/)), Mastercard at 1.5%. Exceed thresholds → monitoring programme with network fines of **$50-$150 per dispute** on top of Stripe's fees ([Stripe](https://stripe.com/guides/introduction-to-payment-disputes#understanding-the-dispute-lifecycle), [monitoring programs](https://docs.stripe.com/disputes/monitoring-programs)). Sustained high rates = card networks terminate processing permanently. A merchant at 0.9% globally could be 1.33% on Visa and 0.25% on Mastercard — flagged on Visa only. Mastercard uses current month disputes / previous month transactions, so a slow month after a big one inflates the rate.

AMEX is structurally different — both the card network AND the issuer. They evaluate and decide as the same entity, and their brand is built on cardholder protection. Win rates against AMEX are consistently lower. — [r/stripe](https://www.reddit.com/r/stripe/comments/1skgiix/stripe_dispute_team_is_useless/)

Industry-wide merchant win rate: **~12%**. "Ran a test once where I submitted identical evidence packets for two chargebacks same week, one won one lost. Literally same docs, different processors." — [r/ecommerce](https://www.reddit.com/r/ecommerce/comments/1s40e5u/)

## Problem

Most disputes are friendly fraud — the customer received the product but disputes anyway. "A lot of them aren't even true fraud, just customers skipping support and going straight to their bank." — [r/smallbusiness](https://www.reddit.com/r/smallbusiness/comments/1sx05w7/)

### 1. Building evidence is manual and slow — so merchants don't bother

Responding to a dispute means pulling data from Stripe, querying your database for user activity, structuring it into the right format for the right dispute category (7 types), and submitting within 7-21 days. One shot — can't edit after submission. This takes 30-60 minutes per dispute.

- GitHub Sponsors: "Disputes were rarely, if ever, contested due to the time involved." Smart Disputes saves them 4-5 hours/week. — [Stripe case study](https://stripe.com/customers/github)
- "I've easily lost mid-five-figures to disputes over the years in SaaS" — [r/stripe](https://www.reddit.com/r/stripe/comments/1m9xzo5/)
- "I submitted everything — signed policies, receipts, text messages, photos of the student in my studio... Chase sided with her" — [lost $1,225](https://www.reddit.com/r/stripe/comments/1m9xzo5/chargeback_with_proof_she_received_services/)

### 2. Win rate is terrible — weak evidence, no strategy

Industry-wide merchant win rate: ~12%. Merchants submit generic Stripe data or skip categories entirely. The bank reviewer scans evidence in under 60 seconds.

- "I went with Stripe's recommendation of 'Smart Dispute' with minimal proof attached and that got rejected" — [r/stripe](https://www.reddit.com/r/stripe/comments/1rlyox0/unfair_disputes_are_ruining_businesses/)
- "Ran a test once where I submitted identical evidence packets for two chargebacks same week, one won one lost." — [r/ecommerce](https://www.reddit.com/r/ecommerce/comments/1s40e5u/)
- "The amount of money I lose every month to chargebacks is actually insane. Chargebacks? They're eating my margins alive." — [r/ecommerce](https://www.reddit.com/r/ecommerce/comments/1p2r5fz/)

### Who has this problem

Every Stripe merchant with digital proof of delivery somewhere in their stack. The pain scales with dispute volume, but even a single dispute hurts at early stage ("Lost around 20 EUR on a 9.99 subscription" — [$15 fee + the sub itself](https://www.reddit.com/r/SaaS/comments/1rwwckl/)).

| Segment                            | Evidence source                                                      | Why they're underserved                                                     |
| ---------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **SaaS / AI tools** (launch)       | Database — session logs, feature usage, API calls, generated outputs | Evidence exists but is trapped in their DB. No tool queries it.             |
| **Online courses / education**     | Database — lesson completion, progress, quiz scores                  | Completion data proves delivery. Same gap.                                  |
| **Marketplaces / platforms**       | Database — transaction history, activity on both sides               | Eat disputes on transactions they only facilitated.                         |
| **E-commerce** (expansion)         | Shopify / WooCommerce — order history, fulfillment, tracking         | Existing tools handle this but with generic data. Agent pulls richer proof. |
| **Service businesses** (expansion) | CRM / project tools — deal history, deliverables, communication logs | Evidence scattered across HubSpot, email, Drive. No one aggregates it.      |

## Current Solutions

Merchants either don't contest, fight manually, or use tools that only access payment data — none of them pull evidence from the merchant's own systems.

**Don't contest** — Accept the loss. Most common. GitHub Sponsors: "Disputes were rarely, if ever, contested due to the time involved." — [Stripe case study](https://stripe.com/customers/github)

**Fight manually** — Pull data yourself, structure a case, submit. 30-60 min per dispute. Evidence scattered across Stripe, database, email, storage.

**Stripe Smart Disputes** ([docs](https://docs.stripe.com/disputes/smart-disputes)) — Auto-submits evidence using Stripe's own data (transaction, cardholder, payment history). 30% of recovered. No access beyond what Stripe already has. "I went with Stripe's recommendation of 'Smart Dispute' with minimal proof attached and that got rejected" — [r/stripe](https://www.reddit.com/r/stripe/comments/1rlyox0/unfair_disputes_are_ruining_businesses/)

**Chargeflow** ([site](https://www.chargeflow.io/products/automation)) — Connects to Shopify, helpdesks, shipping carriers. 1000+ data points. 25% of recovered. 100+ integrations. Good for e-commerce. No access to your application database.

**The gap:** For SaaS, AI tools, courses, digital products — the winning evidence is user activity in your database (sessions, usage, generated content). None of them can access it.

## Field Signals From Outreach

### Reddit: chargeback ops pain

Source: [r/payments](https://www.reddit.com/r/payments/comments/1t3cxfs/chargebacks_are_stealing_hours_and_our_team_cant/)

Signals:

- Merchant reports 10-15 chargebacks/week.
- Each case takes 1-2 hours.
- Work spans Stripe, PayPal, receipts, response writing, and bank portals.
- Commenters independently confirm the same manual Stripe-data collection pain.
- Commenters mention Chargeflow and generic AI/Claude as possible solutions.

Interpretation:

- The pain is evidence reconstruction across systems, not just writing.
- Existing automation tools validate willingness to use/pay, but leave room for a SaaS/app-data wedge.
- Generic AI is already in the buyer's imagination; Riposte must package it into a reliable workflow with connected data, source-backed facts, and submission states.

### Reddit: SaaS proof of value

Source: [r/SaaS](https://www.reddit.com/r/SaaS/comments/1s6m6gw/let_a_customer_prepay_for_a_year_at_a_discount/)

Signals:

- Annual SaaS customer disputed a $2,900 prepayment after 10-11 months.
- Merchant had regular usage data, but still lost because the claim was "service not as described."
- The evidence burden was not just "customer logged in." It was proving the service was delivered as described and that the customer received value over time.
- Merchant response after losing: clearer annual contract, lawyer-reviewed ToS, annual commitment acknowledgment email, and automated monthly usage/value summary emails for annual customers.

Interpretation:

- SaaS disputes need proof of value, not only receipts or access logs.
- Evidence packets should translate raw app activity into a concise story: what was promised, what was delivered, how the customer used it, and whether they complained or asked to cancel/refund.
- For annual SaaS, the strongest evidence may be created before any dispute: recurring value summaries, explicit commitment acknowledgment, clearer service descriptions, and preserved customer communications.
- V2 engine implication: Riposte should audit whether the merchant's ToS/product promise is defensible. Vague terms make usage logs weaker because login activity alone may not prove the service was delivered as described.

### Reddit: early fraud warnings

Source: [r/stripe](https://www.reddit.com/r/stripe/comments/1t4fgym/the_purpose_of_early_fraud_warnings_if/)

Signals:

- Merchants report refunding immediately after an EFW and still receiving a dispute plus fee.
- Another merchant says refund evidence can still win the dispute or recover fees.
- The useful response is a timeline: EFW time, refund time/status, dispute timing, customer/payment identity, and delivery/usage proof.

Interpretation:

- EFWs are an early-response wedge, not only a prevention feature.
- Riposte should be able to prepare timestamped evidence before or during dispute escalation.

## The Insight

The bank reviewer asks one question: **"Did this person get what they paid for?"**

A Stripe receipt doesn't answer that. Your app's data does:

- User signed up Jan 3, generated 847 images over 4 months, last active 2 days before dispute
- 142 sessions, 23 hours of usage, never contacted support, never requested a refund
- 6 screenshots of actual content they created

That's not a payment record. That's a case.

**What winners actually do** (from threads where merchants won):

1. Evidence ready before disputes happen, not after
2. A single structured document — not scattered attachments
3. Speed — submitting within hours, not days
4. Usage logs with timestamps showing the customer actively used the product
5. Relating evidence directly to the customer's specific claim
6. "I gathered all relevant information and used ChatGPT to help me structure my evidence into one big document" — [won a high-ticket dispute](https://www.reddit.com/r/stripe/comments/1o0c5dt/)

Screenshots matter disproportionately. The bank reviewer scans a PDF in 30 seconds — images are undeniable. SaaS dashboards, generated content, completed lessons, AI outputs. Stripe doesn't require them, but they answer the core question visually.

AMEX reviewers specifically respond better to a single clear document that walks through a timeline rather than scattered attachments. Usage logs beat contracts for service businesses.

**Visa CE 3.0** — a new weapon most merchants don't know exists. Automatically shifts liability for friendly fraud (Reason Code 10.4) if you provide two prior undisputed transactions (120-365 days old) with at least two matching data elements (one must be IP address or device fingerprint). — [r/ecommerce](https://www.reddit.com/r/ecommerce/comments/1s40e5u/)

Levelsio (Interior AI) proved this approach at scale — went from losing every dispute to winning them, including a $1,199 case — by pulling real user activity from his database. But he built custom PHP scripts hardcoded to his app.

## Evidence Spec (What Stripe Needs)

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

## How Riposte Works

**Why an agent, not a SaaS:** Chargeflow connects to Stripe and pulls payment data. An agent connects to your database, reads your schema, queries actual user activity, grabs screenshots from your storage, and submits app-specific evidence. The evidence quality is 10x because it's not generic.

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
├── CONTEST DECISION (see below)
├── Submits to Stripe in <60 seconds
└── Notifies you (Slack/Telegram/Discord/Email)

REVIEW (v2, periodic)
├── Analyze won vs lost cases — what evidence correlated with wins
├── Propose changes: strategy, prompts, evidence sources, data access
└── Surface gaps: "you'd win more if I had access to X"
```

**Contest decision:** Contesting costs $15 (countered fee). Agent needs a strategy: contest all, contest if confident, or notify merchant and let them decide.

### Building a winning case

**Category-specific strategy:** Agent categorizes the dispute (7 types), then runs different checks per category — e.g. "duplicate" → did we actually charge twice? "subscription cancelled" → check cancellation vs charge timestamps.

**Evidence per category:** Stripe lists required evidence per dispute category ([visual evidence](https://docs.stripe.com/disputes/visual-evidence), [best practices](https://docs.stripe.com/disputes/best-practices)). This is the agent's playbook.

**Customer authorization (>50% of disputes):** AVS matches, CVC confirmations, IP address matching billing address, signed receipts, 3DS authentication. Stripe auto-includes AVS/CVC/IP if available — agent verifies during onboarding that this data is captured.

**Proof of delivery (digital goods):** IP address or system log proving the customer downloaded content or used the software/service. This is exactly what the agent pulls from the merchant's DB.

**Proof of delivery (physical goods):** Full shipping address (not just city/postal code), tracking confirmation. If "Ship to" name differs from cardholder, document why (gift purchase).

**Formatting constraints:** Max 4.5MB combined, under 50 pages (Mastercard: under 19). Min 12pt font, portrait orientation. Concise and professional — issuers process thousands daily, won't read lengthy docs.

**Terms of service:** Include a screenshot of checkout showing terms/refund policy — not the full policy text, issuers won't read it ([best practices](https://docs.stripe.com/disputes/best-practices)). Agent should capture or request this screenshot during onboarding.

**Discrediting evidence:** Two things that invalidate a dispute — customer withdrawal documentation (`customer_communication`) and proof of prior compensation (`refund_refusal_explanation`). Agent should learn during onboarding how the merchant communicates with customers and where refund/compensation records live.

**Partial refunds:** Customer can dispute the full amount even after receiving a partial refund — merchant gets double-charged. Always contest: issuers are "very willing to rectify" ([best practices](https://docs.stripe.com/disputes/best-practices)). Agent checks Stripe for prior refunds on the charge, submits proof — near-guaranteed win, no DB access needed.

### Dispute Readiness Score

Gamified checklist shown during/after onboarding. Helps merchants improve their evidence stack before a dispute hits. Items like: save IP addresses, log user activity, retain data 75+ days, capture AVS/CVC at checkout, screenshot checkout terms, store customer communications. Each item improves the score — higher score = stronger cases.

**One submission only:** Can't edit or add evidence after submitting ([responding](https://docs.stripe.com/disputes/responding)). Agent must get it right the first time.

### Background evidence

Stripe auto-captures some background evidence (billing address, name, email, IP, receipt) if the integration supports it ([best practices](https://docs.stripe.com/disputes/best-practices)). The more data the merchant's integration passes to Stripe at payment time, the stronger the baseline. Agent should match IP/email from merchant's logs to Stripe checkout session — if they match, that's strong authorization proof.

### Dashboard & analytics

**Dispute metrics:** Win/loss rate, dispute rate per card network, average response time, cost saved vs manual.

**Customer intelligence:** Repeat offenders (same customer filing multiple disputes), customers linked by shared signals (email, IP, device fingerprint, shipping address). Alert if heuristic detects a pattern — e.g. cluster of disputes from related accounts.

### Edge cases ([how disputes work](https://docs.stripe.com/disputes/how-disputes-work))

**Multiple disputes per payment:** Customer can file again with a different reason code or for a different line item. Agent must check for existing disputes on the same payment and handle each individually.

**Early Fraud Warnings:** Visa (TC40) and Mastercard (SAFE) flag potentially fraudulent payments before disputes. 80% escalate to chargebacks if merchant does nothing. Agent should act on EFWs — refund if amount ≤ dispute fee, otherwise prepare evidence preemptively.

**AMEX/Discover inquiries:** Pre-dispute phase — can resolve without fees by providing evidence or issuing refund. Agent should prioritize these as free wins.

**Late wins:** Disputes marked `lost` can shift to `won` when issuers adjust outside normal cycles. Agent should track these.

**Local Payment Methods (LPMs):** Klarna, PayPal etc. — not card networks, separate dispute processes. The LPM provider decides (not a bank), 180-day dispute window (vs 120 for cards), different fees and evidence requirements per provider ([Klarna disputes](https://docs.stripe.com/disputes/klarna), [PayPal disputes](https://docs.stripe.com/disputes/paypal)). Must explicitly list supported LPMs — each needs its own integration.

### Dispute prevention (v2+)

Reduce disputes before they happen. Stripe already does some of this ([prevention preview](https://docs.stripe.com/disputes/prevention-preview)) — send transaction data to cardholders so they recognize charges, auto-refund high-risk low-value disputes. Agent could go further: analyze dispute patterns, flag risky customers pre-charge, recommend merchant-side changes (clearer billing descriptors, post-purchase confirmation emails, better refund flow).

### Architecture — 90% deterministic, 10% AI

```
Stripe webhook (charge.dispute.created)
  │
  [DETERMINISTIC] Pull dispute + charge + customer from Stripe
  [AGENT via MCP] Query merchant DB for user activity
  [DETERMINISTIC] Pull invoice PDF from Stripe
  [DETERMINISTIC] Generate evidence PDF (activity table, screenshots, stats)
  [AI] Generate 3 persuasive text fields
  [DETERMINISTIC] Upload to Stripe, submit evidence
  [DETERMINISTIC] Notify merchant
```

No hallucinated evidence. AI writes three text fields. Everything else is deterministic code.

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

**vs. manual:** Hours per dispute → under 60 seconds.
**vs. Chargeflow:** 25% fee, generic data → free, your actual data.
**vs. Stripe Smart Disputes:** 30% fee, same generic data → free, app-specific evidence.

## Ubiquitous Language

| Term                     | Meaning                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------- |
| chargeback               | dispute (used interchangeably)                                                         |
| evidence                 | documents/screenshots/text submitted to fight a dispute                                |
| dispute rate             | % of transactions disputed — the metric that can kill your business                    |
| friendly fraud           | customer received the product but disputes anyway                                      |
| "product not received"   | most common false dispute reason code                                                  |
| "subscription cancelled" | second most common false reason code                                                   |
| reason code              | issuer's classification (Visa 10.4, MC 4837, etc.) — determines what evidence you need |
| representment            | formal name for submitting evidence to contest a dispute                               |
| pre-arbitration          | second round if you lose representment, still decided by issuer                        |
| arbitration              | $400-$600 fee, first neutral review — Stripe almost never escalates                    |
| issuer / issuing bank    | the customer's bank (Chase, AMEX, etc.) — they decide everything                       |
| acquirer                 | Stripe's role — processes payments, receives chargebacks                               |
| CE 3.0                   | Visa Compelling Evidence 3.0 — auto-shifts liability with prior transaction proof      |
| RDR                      | Rapid Dispute Resolution — auto-refund to avoid dispute (can backfire)                 |
| Chase                    | the issuing bank merchants hate — "I never won a case with Chase"                      |
| AMEX                     | both network AND issuer — structurally harder to win against                           |
| $15 fee                  | Stripe dispute fee, charged even if you win                                            |
| monitoring program       | Visa/Mastercard penalty program for high dispute rates                                 |
| "fraud tax"              | the 1-2% merchants bake into pricing to absorb expected dispute losses                 |
| "theater of evidence"    | the feeling that submitting proof is performative — nobody reads it                    |

## Validation

- Levelsio (Interior AI) shared his full auto-dispute system publicly — massive viral engagement, proved the approach works
- Tibo built the same thing for Revid in 1 hour, winning disputes
- @indiesoftwaredv winning disputes with Claude-prepared documents
- Andre Baltazar built the same for PayPal
- Lenny Rachitsky: "I need this"
- Peter Yang: "can you open source this?"
- Bram (@Bram_SaaS): "Market this as an app it's a no brainer I need this for apps doing volume"
