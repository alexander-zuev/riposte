# Landing Page — riposte.sh

## Design References

Studied: [DataFast](https://datafa.st), [SEObot](https://seobotai.com), [Outrank](https://outrank.so), [1Capture](https://1capture.io)

**Patterns that work across all four:**

- Hero is short — headline, one-liner, inline CTA, social proof avatars. Nothing else.
- Product demo/screenshot is the second thing you see — not explanation text.
- Founder story with face builds trust fast (DataFast, SEObot).
- Features shown visually (screenshots, videos, mockups) — not described in paragraphs.
- Problem framed as the visitor's current pain, not industry stats.

---

## Story Arc

6 sections. Visual-first, copy-light. Show the product, not the problem domain.

```
1. HERO           Short headline + CTA + social proof          → Recognition
2. DEMO           Product mockup / evidence card               → "Oh, it actually does something"
3. PROBLEM        3 cards: your current options suck            → Validate frustration
4. HOW IT WORKS   3-step flow, visual                          → Trust through transparency
5. FOUNDER        Alexander's face + why I built this          → Credibility
6. CTA            Cloud vs self-hosted + trust signals         → Action
```

---

## Section 1 — Hero

Short. Emotional. One CTA.

**Headline:**

> Win your Stripe disputes on autopilot

**Subline:**

> Open-source AI agent that pulls evidence from your database and submits it in under 60 seconds.

**CTA:** `[Get Started — Free]`

**Social proof:** Avatar row + "Used by X developers" (placeholder until real numbers)

```
┌─────────────────────────────────────────────────────────────┐
│                           nav                               │
│                                                             │
│                                                             │
│                                                             │
│              Win your Stripe disputes                       │
│                  on autopilot                               │
│                                                             │
│         Open-source AI agent that pulls evidence            │
│         from your database and submits it in                │
│         under 60 seconds.                                   │
│                                                             │
│                ┌──────────────────┐                          │
│                │ Get Started Free │                          │
│                └──────────────────┘                          │
│                                                             │
│              (●)(●)(●)(●)(●) Used by X devs                 │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Section 2 — Demo

Product screenshot or interactive mockup. No text section — the visual IS the section.

Show a stylized evidence card that Riposte would generate — the kind of thing a bank reviewer sees. This is the "aha" moment: "oh, it builds a real case from my data."

**Mockup: Evidence Summary Card**

Styled like a real document/dashboard, not a wireframe. Shows:

- Dispute details (amount, reason, date)
- Customer activity pulled from merchant's DB (signup date, sessions, usage, last active)
- Screenshots placeholder
- Verdict: "Recommend: contest — strong evidence of delivery"

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌───────────────────────────────────────────────────┐     │
│   │  ┌─ riposte ─────────────────────────────────┐    │     │
│   │  │                                            │    │     │
│   │  │  Dispute #dp_1R2x...   $49.00  Fraudulent  │    │     │
│   │  │  ─────────────────────────────────────────  │    │     │
│   │  │                                            │    │     │
│   │  │  Customer: jane@acme.co                    │    │     │
│   │  │  Signed up: Jan 3, 2026                    │    │     │
│   │  │  Usage: 847 images, 142 sessions, 23h      │    │     │
│   │  │  Last active: 2 days before dispute        │    │     │
│   │  │  Support tickets: 0                        │    │     │
│   │  │  Refund requests: 0                        │    │     │
│   │  │                                            │    │     │
│   │  │  ┌──────┐ ┌──────┐ ┌──────┐               │    │     │
│   │  │  │ img  │ │ img  │ │ img  │  Screenshots   │    │     │
│   │  │  └──────┘ └──────┘ └──────┘               │    │     │
│   │  │                                            │    │     │
│   │  │  ✓ Contest — strong evidence of delivery   │    │     │
│   │  │  Submitted in 47 seconds                   │    │     │
│   │  └────────────────────────────────────────────┘    │     │
│   └───────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Section 3 — Problem

3 cards. Short. Visual icons or illustrations on each. No paragraphs.

**Section badge:** `THE PROBLEM`

**Headline:**

> Three options. None of them work.

**Card A — Ignore it**

- You eat the $15 fee + lost revenue
- Dispute rate climbs silently
- One bad month and you're flagged

**Card B — Fight manually**

- 30-60 minutes per dispute
- Evidence is generic — you lose anyway
- At 10+ disputes/month it's a part-time job

**Card C — Pay someone else**

- 25-30% of recovered revenue
- They only see what Stripe sees
- Same weak evidence, different wrapper

**Kicker (centered, below cards):**

> They all have the same problem: they can only see what Stripe sees. That's not evidence — that's a receipt.

```
┌─────────────────────────────────────────────────────────────┐
│  panel                                                      │
│                     THE PROBLEM                             │
│                                                             │
│           Three options. None of them work.                 │
│                                                             │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐    │
│   │     ✕         │ │     ⏱         │ │     $         │    │
│   │  Ignore it    │ │ Fight manually│ │ Pay someone   │    │
│   │               │ │               │ │               │    │
│   │  $15 fee +    │ │  30-60 min    │ │  25-30% of    │    │
│   │  lost revenue │ │  per dispute  │ │  recovered $  │    │
│   │               │ │               │ │               │    │
│   │  Rate climbs  │ │  Generic      │ │  Only sees    │    │
│   │  silently     │ │  evidence     │ │  Stripe data  │    │
│   │               │ │               │ │               │    │
│   │  One bad      │ │  Part-time    │ │  Same weak    │    │
│   │  month →      │ │  job at 10+   │ │  evidence     │    │
│   │  flagged      │ │  /month       │ │               │    │
│   └───────────────┘ └───────────────┘ └───────────────┘    │
│                                                             │
│      They can only see what Stripe sees.                    │
│      That's not evidence — that's a receipt.                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Section 4 — How It Works

3 steps (not 5 — compress). Horizontal on desktop, vertical on mobile. Each step has an icon/number and one line.

**Section badge:** `HOW IT WORKS`

**Headline:**

> Dispute comes in. Evidence goes out.

```
1. WEBHOOK FIRES     →  Stripe notifies Riposte
2. EVIDENCE PULLED   →  Agent queries your DB + Stripe for real user activity
3. CASE SUBMITTED    →  PDF generated, uploaded to Stripe. Under 60 seconds.
```

**Below (muted, small):**

> 90% deterministic. 10% AI. No hallucinated evidence.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     HOW IT WORKS                            │
│                                                             │
│           Dispute comes in. Evidence goes out.              │
│                                                             │
│                                                             │
│   ┌─ 1 ──────────┐    ┌─ 2 ──────────┐    ┌─ 3 ──────────┐│
│   │               │    │               │    │              ││
│   │  ⚡ Webhook   │ →  │  🔍 Evidence  │ →  │  ✓ Case     ││
│   │    fires      │    │    pulled     │    │   submitted  ││
│   │               │    │               │    │              ││
│   │  Stripe       │    │  Agent queries│    │  PDF → Stripe││
│   │  notifies     │    │  your DB +    │    │  < 60 seconds││
│   │  Riposte      │    │  Stripe       │    │              ││
│   │               │    │               │    │              ││
│   └───────────────┘    └───────────────┘    └──────────────┘│
│                                                             │
│       90% deterministic. 10% AI. No hallucinated evidence.  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Section 5 — Founder

Personal. Short. Photo + 3-4 lines max. Inspired by DataFast's Marc Lou section and SEObot's John Rush section.

**Layout:** Photo left, text right.

**Text:**

> I'm Alexander, the creator of Riposte.
>
> I built this because I watched SaaS founders spend hours per dispute assembling evidence that was already sitting in their database. The tools that exist either use generic Stripe data or charge 25-30% of what they recover.
>
> Riposte connects to your actual data and builds the case automatically. Open-source, self-hostable, no percentage fees.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌──────────┐                                              │
│   │          │  I'm Alexander, the creator of Riposte.      │
│   │  photo   │                                              │
│   │          │  I built this because I watched SaaS         │
│   │          │  founders spend hours per dispute             │
│   └──────────┘  assembling evidence that was already        │
│                 sitting in their database.                   │
│                                                             │
│                 Riposte connects to your actual data         │
│                 and builds the case automatically.           │
│                 Open-source, self-hostable, no % fees.       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Section 6 — CTA

**Headline:**

> Stop losing disputes you should win

**Two cards side by side:**

**Cloud (riposte.sh)**

> Connect Stripe. Connect your database. Done.
> `[Get Started — Free]`

**Self-hosted (GitHub)**

> Deploy to your own Cloudflare account. Full control. AGPLv3.
> `[View on GitHub]`

**Trust signals (row below, muted):**

- Open-source — inspect every line
- Read-only database access
- You control Stripe API scopes
- No hallucinated evidence

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│            Stop losing disputes you should win              │
│                                                             │
│     ┌────────────────────┐  ┌────────────────────┐          │
│     │    Cloud            │  │    Self-hosted     │          │
│     │                    │  │                    │          │
│     │  Connect Stripe.   │  │  Deploy to your    │          │
│     │  Connect your DB.  │  │  own Cloudflare.   │          │
│     │  Done.             │  │  Full control.     │          │
│     │                    │  │  AGPLv3.           │          │
│     │  [Get Started]     │  │  [View on GitHub]  │          │
│     └────────────────────┘  └────────────────────┘          │
│                                                             │
│   ○ Open-source    ○ Read-only DB    ○ You control scopes   │
│   ○ No hallucinated evidence                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Notes

### Tone

- Direct. Confident. Not confrontational — just clear.
- Hero is calm and factual. Problem section has edge. Rest is confident.

### Visual Direction

- Dark theme, `bg-background` base
- Section 3 (Problem) uses `bg-surface` panel to break visual rhythm
- Evidence card mockup styled like a real product screenshot — not a wireframe
- How It Works: horizontal 3-step flow with arrows, not a verbose timeline
- Minimal decorative elements — content and product carry the page

### Typography

- Large, bold headlines — readable in 2 seconds
- Body text: no paragraph longer than 3 lines
- One font weight contrast: bold headlines, regular body

### Mobile

- Hero stacks naturally (already single column)
- Demo mockup scales down
- 3 problem cards stack to single column
- How It Works steps stack vertically
- Founder section: photo above, text below
- CTA cards stack

### Content Gaps

- [ ] Product screenshot / dashboard mockup (once UI exists — use evidence card mockup for now)
- [ ] Social proof numbers (placeholder until real users)
- [ ] Alexander's photo for founder section
- [ ] og:image for social sharing
- [ ] Demo video or GIF (v2)
