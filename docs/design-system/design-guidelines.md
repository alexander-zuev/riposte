# Riposte Design Guidelines

## Product definition

Riposte is an **AI dispute agent for Stripe**. It investigates real user activity, logs, Stripe data, and product context, then builds and submits structured evidence packets for disputes.

The interface is not the product. The **agent is the product**. The UI exists to monitor results, review cases, inspect submitted packets, and debug issues.

## Brand principles

Riposte should feel:

- precise
- professional
- forensic
- evidence-first
- autonomous
- calm
- technical but not hacker-ish
- trustworthy enough for finance/legal workflows

Avoid:

- generic SaaS dashboards
- playful AI visuals
- cyberpunk terminals
- legal clichés like scales or shields
- literal fencing, swords, or mascots
- blue fintech default branding

## Visual direction

Use a **light-first evidence system**.

The product should feel like a mix of:

- clean evidence dossier
- automated agent activity log
- financial/legal review tool
- technical audit interface

Primary visual mood: **monochrome, structured, sharp, with restrained amber evidence accents**.

## Logo direction

Use the **Reversal Mark**.

Concept:

> A dispute comes in. Riposte turns it around. Evidence goes back stronger.

Guidelines:

- left-facing direction preferred
- simple geometric mark
- horizontal reversal, not downward
- asymmetric: finish/arrowhead should be visually stronger than the start
- works in monochrome
- optional amber accent, but do not depend on it
- buildable as simple SVG/React/CSS

Avoid:

- browser back-button look
- enter/return key shape
- refresh/sync icon
- undo icon
- sword/fencer/shield imagery

## Color system

Use **Radix Colors**. Do not invent random token values.

Recommended structure:

- **Neutral base:** Radix `sand`
- **Primary UI color:** graphite / near-black
- **Accent:** Radix `amber`
- **Success:** Radix `green`
- **Danger:** Radix `red`
- **Warning:** Radix `orange`
- **Info:** blue only if necessary, never as brand primary

Use amber sparingly for:

- evidence highlights
- active states
- primary emphasis
- timeline markers
- proof found / packet built moments

The UI should mostly be white/off-white, graphite text, soft gray borders, and controlled amber accents.

## Typography

Two-font system. See `typography.css` for implementation.

**Inter** — the default product font. Headings, body copy, buttons, navigation, labels, descriptions, forms. Clean, professional, optimized for readability.

**JetBrains Mono** — the system-truth font. Case IDs, timestamps, Stripe IDs, logs, event names, metadata, code blocks, and the brand name. Use `text-system` utility or `font-mono` class. Scarce by design — mono is meaningful because it's rare.

## Component style

- Light surfaces, sharp or low-radius corners
- Clear borders, minimal shadows (borders first, shadows only for real elevation)
- Compact but readable spacing
- Strong alignment and grid discipline

## Evidence packet

The evidence packet is a hero artifact.

It should feel:

- structured
- concise
- compliant
- readable
- professional
- document-native

Do not over-design it. It should look like something Stripe or a reviewer would trust.

## Copy style

Use direct, factual language.

Good:

- Dispute received
- Evidence packet built
- Submitted to Stripe
- Sources used
- Needs review
- Riposte found supporting usage evidence

Avoid:

- AI hype
- too much fencing language
- vague SaaS claims
- “magic” phrasing

Use the Riposte metaphor lightly. The product promise should stay clear.

