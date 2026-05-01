# Landing Page — riposte.sh

## Story Arc

The page tells a story in 7 beats. Each section answers one question the visitor has in their head at that moment. The visitor arrives angry about disputes — we meet them there and walk them to the solution.

```
1. HOOK          "You're losing money to chargebacks"         → Emotional recognition
2. STAKES        "And if you ignore them, it gets worse"      → Fear of inaction
3. BROKEN        "Current solutions don't actually work"      → Validate frustration
4. INSIGHT       "One person cracked it — with real data"     → Curiosity + proof
5. PRODUCT       "We turned that into a product"              → Relief
6. HOW           "Here's exactly what happens"                → Trust through transparency
7. CTA           "Set it up in 5 minutes"                     → Action
```

---

## Section 1 — Hook

**Visitor mindset:** "I just got hit with another dispute / I'm researching this problem"

**Headline:**

> Stripe disputes cost you money, time, and — if you're not careful — your entire business.

**Supporting stat line (pick 2-3):**

- Average chargeback costs $191 when you factor in fees, lost product, and operational time
- Default win rate: 10-20%. Most businesses don't even try.
- Every dispute costs $15. Contest and lose — that's $30 gone.

**Visual:** Stripe dispute notification email (stylized) or a counter showing money lost.

---

## Section 2 — Stakes

**Visitor mindset:** "Ok how bad can this actually get?"

**Headline:**

> The dispute rate nobody tells you about

**Content — escalation ladder:**

| Dispute Rate | What Happens                                         |
| ------------ | ---------------------------------------------------- |
| < 0.5%       | You're fine                                          |
| 0.5%         | Visa flags you. Monitoring program begins.           |
| 0.75%        | Stripe warns you. You're on the clock.               |
| 1.0%         | Fines start. $5K-$25K/month.                         |
| 1.5%+        | Mastercard flags you. Fines escalate to $100K/month. |
| Sustained    | Card networks terminate processing. Game over.       |

**Kicker:**

> Most founders find out about monitoring programs after they're already in one.

**Source:** Link to Stripe's monitoring programs docs.

---

## Section 3 — Broken Solutions

**Visitor mindset:** "Surely there are tools for this?"

**Headline:**

> You've got three options. None of them work.

**Option A — Ignore it**

- You eat the loss + the $15 fee
- Your dispute rate climbs silently
- One bad month and you're flagged

**Option B — Fight manually**

- Open Stripe dashboard, download data, write a response
- 30-60 minutes per dispute. Per dispute.
- The evidence is generic. Win rate stays low.
- At 10+ disputes/month this is a part-time job

**Option C — Pay someone else**

- Chargeflow: 25% of recovered revenue. Pulls generic Stripe data only.
- Chargebacks911: Enterprise. $$$. Months to onboard.
- Stripe Smart Disputes: 30% of recovered amount. Uses the same data you already have.

**Kicker:**

> They all have the same problem: they can only see what Stripe sees. Payment data. Timestamps. Card info. That's not evidence — that's a receipt.

---

## Section 4 — The Insight

**Visitor mindset:** "So what actually works?"

**Headline:**

> The only evidence that wins is evidence the bank can't ignore

**Content:**

When a bank reviewer looks at a dispute, they have one question:

> "Did this person get what they paid for?"

A Stripe receipt doesn't answer that. Your app's data does.

- User signed up Jan 3, generated 847 AI images over 4 months, last active 2 days before the dispute
- 6 screenshots of actual content they created
- Activity log showing 142 sessions, 23 hours of usage
- They never contacted support. Never asked for a refund.

That's not a payment record. That's a case.

**Proof point:**
Levelsio (Interior AI) went from losing every dispute to winning them — including a $1,199 case — by pulling real user activity from his database and submitting it as evidence. He shared the entire system publicly.

**But:** He built custom PHP scripts hardcoded to his app. It works for him. It doesn't work for you.

---

## Section 5 — The Product

**Visitor mindset:** "Ok I want this. Is there a product?"

**Headline:**

> Riposte fights your Stripe disputes with your actual data

**Subhead:**

> Open-source AI agent. Connects to your database. Submits evidence in under 60 seconds. Runs on autopilot.

**Three pillars (cards or columns):**

1. **Reads your data, not just Stripe's**
   Connects to your database via read-only access. Pulls real user activity — signups, actions, timestamps, deliverables. Builds evidence the bank can't dismiss.

2. **Responds in seconds, not hours**
   Webhook fires → agent wakes up → evidence collected → PDF generated → submitted to Stripe. Under 60 seconds. No human in the loop.

3. **Adapts to your app, not the other way around**
   You don't write integration code. The agent discovers your schema, finds where user activity lives, and builds its own playbook. Schema changes? It adapts.

---

## Section 6 — How It Works

**Visitor mindset:** "Show me the mechanics"

**Headline:**

> What happens when a customer disputes a charge

**Flow (visual, step-by-step):**

```
1. DISPUTE CREATED
   Stripe webhook fires → Riposte wakes up

2. EVIDENCE COLLECTED
   Pulls customer data from Stripe
   Queries YOUR database for user activity
   Grabs screenshots/deliverables from your storage

3. CASE BUILT
   Generates evidence PDF:
   - Customer info + payment details
   - Activity timeline with dates and counts
   - Up to 6 product screenshots
   - AI-written argument referencing real data

4. SUBMITTED
   Uploads evidence to Stripe Disputes API
   Under 60 seconds from webhook to submission

5. YOU'RE NOTIFIED
   Slack / Telegram / Discord / Email
   Full case summary — what was submitted, why
```

**Architecture callout (small, for technical visitors):**

> 90% deterministic. 10% AI. The agent uses AI for three persuasive text fields. Everything else — data collection, PDF generation, Stripe submission — is deterministic code. No hallucinated evidence.

---

## Section 7 — CTA

**Visitor mindset:** "I want this"

**Two paths:**

**Cloud (riposte.sh)**

> Connect Stripe. Connect your database. The agent handles the rest.
> [Get Started — Free]

**Self-hosted (GitHub)**

> Deploy to your own Cloudflare account. Full control. AGPLv3.
> [View on GitHub]

**Below CTA — trust signals:**

- Open-source — inspect every line of code
- Read-only database access — the agent never writes to your data
- You control the Stripe API scopes
- Evidence is deterministic — no hallucinated data

---

## Design Notes

### Tone

- Direct. No corporate softness.
- Slightly confrontational in sections 1-3 (you're losing, options are broken)
- Shifts to confident and calm in sections 5-7 (here's how it works, here's what to do)
- Technical credibility without jargon overload

### Visual Direction

- Dark theme (matches `THEME_COLOR: #0C0A09` — stone-950)
- Minimal. Lots of whitespace. Let the copy breathe.
- Stripe's purple as accent for dispute-related visuals
- Code blocks / terminal aesthetic for the "how it works" flow
- The escalation table (section 2) should feel ominous — red gradient as rates climb
- Product screenshots once we have a UI to show

### Typography

- Large, bold headlines that can be read in 2 seconds
- Body text kept short — no paragraph longer than 3 lines
- Stats and numbers should be visually prominent (large font, color accent)

### Interactions

- Smooth scroll between sections (no hard jumps)
- The "how it works" flow could animate as user scrolls (step by step reveal)
- Escalation table rows could highlight/animate on scroll

### Mobile

- Every section must work as a single scroll on mobile
- Table in section 2 becomes stacked cards on small screens
- Flow in section 6 becomes vertical timeline

---

## Content Gaps (need before building)

- [ ] Actual win rate data or projections (levelsio's results, industry benchmarks)
- [ ] Product screenshots / UI mockups (once chat UI exists)
- [ ] Testimonials / early user quotes (launch thread responses)
- [ ] Pricing details for hosted version (if any)
- [ ] og-image.png for social sharing
- [ ] Demo video or GIF of the agent in action
