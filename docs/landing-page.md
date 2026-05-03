# Landing Page — riposte.sh

## Concept

**"A Dispute, in Five Acts"** — a scroll-driven cinematic landing page.

The hero catches you. Then you scroll, and the viewport becomes a stage. One real dispute enters. You watch Riposte fight it — from webhook to win. No feature grids, no "how it works" sections. The animation *is* the pitch.

After the show: minimal closing sections to convert.

### Design Philosophy

- The scroll show replaces "how it works", "features", and "demo" sections entirely
- Show the product working, don't describe it
- Every visual element uses real Stripe data shapes — not fake mockups
- Minimal text. The animation tells the story.

### Technical Approach

- `position: sticky` container inside a tall scroll runway (~500vh)
- `useScroll` + `useTransform` from `motion/react` drive all animations
- Each act maps to a scroll progress range (0→1)
- No external animation libraries needed — motion v12 handles everything

```
┌──────────────────────────────────────────┐
│  HERO (static)                           │  ← normal scroll
├──────────────────────────────────────────┤
│                                          │
│  SCROLL SHOW (sticky viewport)           │  ← 500vh runway
│  Acts 1–5 play as you scroll             │     sticky container stays fixed
│                                          │
├──────────────────────────────────────────┤
│  TRUST (static)                          │  ← normal scroll
├──────────────────────────────────────────┤
│  PRICING (static)                        │
├──────────────────────────────────────────┤
│  CTA (static)                            │
└──────────────────────────────────────────┘
```

---

## Section 1 — Hero

Static. Short. Creates urgency.

**Headline:**

> Win your Stripe disputes on autopilot

**Subline:**

> Open-source AI agent that pulls evidence from your database and submits it in under 60 seconds.

**CTA:** `[Get Started Free]`

**Urgency hook (below CTA, muted):**

> You have 7–21 days to respond. Riposte takes 47 seconds.

**Social proof:** Avatar row + "Become an early adopter" (until real numbers exist)

No demo, no terminal, no mockup. The hero is just text + CTA. The show starts when you scroll.

```
┌─────────────────────────────────────────────────────────────┐
│                           nav                               │
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
│         You have 7–21 days. Riposte takes 47 seconds.       │
│                                                             │
│              (●)(●)(●)(●)(●) Become an early adopter        │
│                                                             │
│                         ↓ scroll                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Section 2 — The Show (Scroll-Driven, Five Acts)

One sticky viewport. ~500vh scroll runway. Progress 0→1 mapped across five acts.

The stage is a dark, clean canvas. Elements animate in and out as the user scrolls.

### Act 1 — The Dispute Arrives (progress 0.00–0.20)

A Stripe `charge.dispute.created` webhook notification drops from the top and settles center-stage. Fields materialize one by one.

**What appears on screen:**

A card styled like a real Stripe webhook payload:

```json
{
  "type": "charge.dispute.created",
  "data": {
    "object": {
      "id": "dp_1R2xK4LkdIwHu7ixkl3ep8mO",
      "amount": 24900,
      "currency": "usd",
      "reason": "fraudulent",
      "status": "needs_response",
      "evidence_details": {
        "due_by": 1687564799,
        "has_evidence": false,
        "submission_count": 0
      }
    }
  }
}
```

A red badge pulses: **"7 days remaining"**

Below the card, small text fades in:

> Customer claims they didn't authorize this charge. You have 7 days.

**Animation sequence:**
1. Card drops from top with slight bounce
2. JSON fields type in sequentially (typewriter feel)
3. Amount highlights red: `$249.00`
4. Reason highlights: `fraudulent`
5. Countdown badge pulses in

---

### Act 2 — The Investigation (progress 0.20–0.45)

Lines shoot out from the dispute card to data sources. Evidence flows back.

**Three data sources appear around the dispute card:**

```
                    ┌─────────────┐
                    │   Stripe    │
                    │   API       │
                    └──────┬──────┘
                           │
    ┌──────────────┐       │       ┌──────────────┐
    │  Your        │───────┼───────│  Activity    │
    │  Database    │       │       │  Logs        │
    └──────────────┘       │       └──────────────┘
                           │
                    ┌──────┴──────┐
                    │  dp_1R2x..  │
                    │  $249.00    │
                    │  fraudulent │
                    └─────────────┘
```

**Evidence chips flow back from each source:**

From Stripe API:
- `✓ Customer since: Jan 3, 2026`
- `✓ 12 successful payments`
- `✓ 0 previous disputes`
- `✓ 0 refund requests`

From Your Database:
- `✓ 142 sessions logged`
- `✓ 23h active usage`
- `✓ 847 images generated`
- `✓ Last active: 2 days before dispute`

From Activity Logs:
- `✓ Purchase IP: 192.168.1.x (US)`
- `✓ Login IP matches purchase IP`
- `✓ Device fingerprint: consistent`
- `✓ Support tickets: 0`

**Animation sequence:**
1. Three source nodes appear (Stripe, Database, Logs) with connecting lines
2. Lines pulse with data flowing toward center
3. Evidence chips slide in from each source, one by one
4. Each chip gets a green `✓` checkmark as it arrives
5. The dispute card is now surrounded by evidence

---

### Act 3 — The Evidence (progress 0.45–0.65)

Evidence chips collapse inward and form a structured PDF document.

**The document assembles on screen:**

```
┌─────────────────────────────────────────┐
│  EVIDENCE SUBMISSION                    │
│  Dispute dp_1R2xK4...  │  May 3, 2026  │
│─────────────────────────────────────────│
│                                         │
│  1. EXECUTIVE SUMMARY                   │
│     Dispute Amount: $249.00             │
│     Reason: Fraudulent                  │
│     Recommendation: Contest             │
│     Evidence Strength: Strong           │
│                                         │
│  2. CUSTOMER ACTIVITY TIMELINE          │
│     ┌──────────────────────────────┐    │
│     │ Jan 3   Account created      │    │
│     │ Jan 5   First session         │    │
│     │ Feb–Apr 142 sessions, 23h    │    │
│     │ Apr 26  Last active           │    │
│     │ Apr 28  Dispute filed         │    │
│     └──────────────────────────────┘    │
│                                         │
│  3. PRODUCT DELIVERY PROOF              │
│     847 images generated                │
│     12 successful payments              │
│     0 support complaints                │
│                                         │
│  4. NETWORK & DEVICE VERIFICATION       │
│     Purchase IP matches login IP        │
│     Consistent device fingerprint       │
│     No VPN / proxy detected             │
│                                         │
│  5. AI-DRAFTED ARGUMENT                 │
│     "The cardholder created their       │
│      account on Jan 3, 2026 and         │
│      actively used the service for      │
│      4 months with 142 sessions..."     │
│                                         │
│  ──────────────────────────────────     │
│  Generated by Riposte │ 4 pages │ PDF  │
└─────────────────────────────────────────┘
```

**Animation sequence:**
1. Evidence chips compress toward center
2. Document outline draws itself (border appears)
3. Sections fill in top-to-bottom (typewriter/reveal)
4. Executive summary fills first
5. Timeline draws as a vertical line with nodes
6. Proof stats counter-animate in
7. AI argument text types in last
8. Footer stamps in: "Generated by Riposte │ 4 pages │ PDF"
9. A progress bar sweeps: "Building evidence..." → `✓ Complete`

---

### Act 4 — The Submission (progress 0.65–0.80)

The document shrinks, gets sealed, and flies to Stripe.

**Visual:**

```
                    Stripe Disputes API
                    ┌─────────────────┐
                    │  ← ← ← ← ← ←  │
                    └─────────────────┘
                         ↑
                         │
                    ╔═══════════╗
                    ║  dp_1R2x  ║
                    ║  4 pages  ║
                    ║  ✓ sealed ║
                    ╚═══════════╝
```

**Animation sequence:**
1. Document shrinks to a compact card/envelope
2. A seal/stamp appears on it: `✓`
3. A line traces upward to "Stripe Disputes API" endpoint
4. Document slides along the line
5. Flash on arrival
6. Status text: `Submitting to Stripe Disputes API...`
7. Checkmark: `✓ Evidence submitted`
8. Timer appears: `47 seconds`
9. Slack notification slides in from corner: `#disputes — Evidence submitted for dp_1R2x ($249.00)`

---

### Act 5 — The Win (progress 0.80–1.00)

Everything fades. The result speaks.

**Visual:**

The dispute card returns, transformed:

```
┌─────────────────────────────────────────┐
│                                         │
│              ┌─────────────┐            │
│              │              │            │
│              │  dp_1R2x..   │            │
│              │  $249.00     │            │
│              │              │            │
│              │   ✓ WON      │            │
│              │              │            │
│              └─────────────┘            │
│                                         │
│           +$249.00 recovered            │
│           47 seconds. Zero effort.      │
│                                         │
│                                         │
│                                         │
│     Stop losing disputes you should win │
│                                         │
│          ┌──────────────────┐           │
│          │  Get Started Free │           │
│          └──────────────────┘           │
│                                         │
└─────────────────────────────────────────┘
```

**Animation sequence:**
1. Stage clears — everything fades out
2. Dispute card fades back in, centered
3. Status morphs from `needs_response` → `won` (green)
4. Amount turns green: `+$249.00 recovered`
5. Subtitle types in: `47 seconds. Zero effort.`
6. Pause (let it breathe)
7. CTA text fades in: "Stop losing disputes you should win"
8. Button appears

---

## Section 3 — Trust

Minimal. 4 one-liners with icons. No cards, no grid — just a clean list.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ○ Open-source — AGPLv3. Inspect every line.                │
│  ○ Read-only — never writes to your systems.                │
│  ○ You control scopes — revoke anytime.                     │
│  ○ No hallucinated evidence — AI drafts arguments, not facts│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Section 4 — Pricing

Two cards side by side.

**Cloud:**
> Connect Stripe. Connect your database. Done.
> `[Get Started Free]`

**Self-hosted:**
> Deploy to your own Cloudflare account. Full control. AGPLv3.
> `[View on GitHub]`

---

## Section 5 — Final CTA

> Stop losing disputes you should win.

`[Get Started Free]`

---

## Design Notes

### Tone
- Calm, confident, technical. Not salesy.
- The animation does the selling. Text is minimal.

### Visual Direction
- Light theme base (`bg-background`)
- The scroll show stage could use a subtle dark or contrasting background to feel like a "theater"
- Real Stripe JSON shapes — not simplified wireframes
- Monospace for data/system elements (`text-system` token)
- Sans-serif for headings and body

### Typography
- `text-display-hero` for main headline
- `text-display` for section headings
- `text-system` (JetBrains Mono) for all data: dispute IDs, amounts, JSON, evidence labels
- Body text: max 2 lines per element

### Mobile Considerations
- Scroll show still works — sticky container + scroll progress is touch-friendly
- May need adjusted scroll runway (shorter on mobile — acts play faster)
- Evidence document might need to be simplified (fewer sections visible)
- Test on iOS Safari specifically (scroll behavior differs)

### Implementation Order
1. Build Act 1 prototype — validate scroll feel and timing
2. If scroll feel is good, build Acts 2–5 sequentially
3. Replace current landing page sections
4. Add Trust + Pricing + CTA sections (simple, static)

### Content Gaps
- [ ] Social proof numbers (placeholder until real users)
- [ ] Alexander's photo for founder section (removed from v2 — consider adding back later)
- [ ] og:image for social sharing (screenshot of the evidence document from Act 3)
- [ ] Mobile scroll testing
