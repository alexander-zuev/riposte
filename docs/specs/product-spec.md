# Riposte Product Spec

Status: draft  
Goal: define the smallest real product worth building before polishing UI or backend internals.

## Product Thesis

Riposte helps Stripe merchants fight disputes with evidence from their own product data, not only Stripe payment records.

The first product should prove one loop:

1. A dispute arrives from Stripe.
2. Riposte finds the customer in the merchant's app data.
3. Riposte builds a clear evidence packet.
4. Riposte submits it, or escalates for merchant input when evidence is missing or risky.
5. The merchant accepts the packet or asks for changes.
6. Riposte retries up to 3 times, then submits or marks the case failed.

## Reference System

Levels.io and Tibo proved the workflow with hardcoded systems for their own apps. The useful pattern is not an invisible "agent in the cloud"; it is a visible dispute operations pipeline:

- Stripe webhook handles new disputes and outcome updates.
- CLI/backfill sync catches existing disputes that webhooks missed.
- Shared evidence collector builds Stripe-ready evidence from Stripe truth + app data.
- Local dispute store tracks dispute IDs, customer mapping, evidence, Stripe response, and outcome.
- Evidence packet includes text fields, receipt PDF, service documentation PDF, usage summary, activity table, and actual product outputs/screenshots.
- Admin dashboard shows dispute metrics, sync status, evidence preview, case detail, PDF links, and regeneration.
- Notifications report submitted, failed, won/lost, and operational errors.

Riposte should industrialize this pattern: keep ingestion, storage, templates, PDF generation, submission, dashboard, and notifications deterministic; use the agent to replace hardcoded app-specific evidence collection by filling prebuilt evidence templates from approved sources.

## MVP Scope

Build a bounded autopilot for Stripe disputes, modeled after the Levels/Tibo systems but reusable across Stripe-native SaaS and digital products.

MVP features:

1. **Agent dispute flow**
   - `BE` Stripe webhook ingestion for new disputes.
   - `BE` Stripe sync/backfill for existing disputes.
   - `BE` Agent investigates Stripe + app data and fills evidence template.
   - `BE` Deterministic packet generation and Stripe submission.

2. **Setup / configuration**
   - `FE+BE` Connect Stripe.
   - `FE+BE` Connect one app database, starting with Postgres/read-only SQL.
   - `FE+BE` Add product, refund, cancellation, and policy context.
   - `FE+BE` Configure notifications.
   - `BE` Connector health checks.

3. **Dispute detail / evidence**
   - `FE+BE` Case detail with status, deadline, amount, reason, and outcome.
   - `FE+BE` Evidence packet preview.
   - `FE+BE` Evidence facts with source references.
   - `FE+BE` Missing evidence / human input prompts.

4. **Notifications / human-in-the-loop**
   - `FE+BE` Escalate when evidence is missing, risky, or unsupported.
   - `FE+BE` Founder accepts packet, requests changes, provides missing input, or marks failed.
   - `BE` Retry packet generation up to 3 times after founder input.
   - `BE` Notify on submitted, needs input, failed, won/lost, connector broken, and deadline approaching.

5. **Metrics / operations**
   - `FE+BE` Dispute list with statuses.
   - `BE` Track dispute outcome updates from Stripe.
   - `FE+BE` Metrics: pending, submitted, won, lost, failed, at risk, recovered, net recovered, ROI.
   - `FE+BE` Recent agent actions.
   - `FE+BE` Connector health and last sync time.

6. **Payments / monetization**
   - `FE+BE` Customer selects one-off packet or plan.
   - `FE+BE` Stripe Checkout / Payment Link before live packet submission or autopilot.
   - `BE` Store payment status on workspace/case.
   - `BE` Gate live submission/autopilot behind paid status.
   - `FE+BE` Show Riposte cost vs disputed/recovered amount.

Excluded for MVP:

- Generic "connect anything" promise.
- PayPal/Klarna/local payment methods.
- Shopify/e-commerce/physical goods workflows.
- Fully dynamic evidence template generation.
- Multi-tenant enterprise controls.
- Win-rate optimization or learning loop.

## Product Risks

We are not treating "do Stripe merchants have dispute pain?" as the primary risk. The pain is visible in public founder posts, Reddit/Stripe threads, and the Levels.io/Tibo examples. The remaining risks are execution risks: picking the right buyer, making setup reliable, and producing evidence founders trust.

1. **Can we consistently reach merchants at the moment dispute pain is urgent?**

   Current stance: Pain exists, but we need distribution into a painful, time-sensitive moment.

   How we address it now:
   - Find buyers from public dispute pain and Stripe-native founder communities.
   - Search Reddit: `r/stripe`, `r/SaaS`, `r/smallbusiness`, `r/ecommerce`.
   - Search X for: `Stripe dispute`, `chargeback`, `Stripe held funds`, `lost dispute`.
   - Watch Indie Hackers, SaaS founder Slack/Discord groups, Paddle/Stripe/Chargeflow comparison threads, and founder posts mentioning fraud/refunds.
   - Reply/DM with a concrete offer: "Send me one dispute + customer activity, I will turn it into a Stripe-ready evidence packet."

2. **Which external systems must MVP support to produce strong evidence without drowning in integrations?**

   Current stance: The product needs merchant data beyond Stripe, but every extra connector increases setup, support, auth, and failure modes.

   How we address it now:
   - First support Stripe + one app database.
   - Postgres/read-only SQL is the default first source.
   - MCP is expansion architecture for later sources, not required for the first sellable loop.

3. **Can an AI agent reliably fill a prebuilt evidence template from Stripe, project context, and app data?**

   Current stance: Our hypothesis is not that every dispute invents a new playbook. We define the best evidence structure up front, give the agent access to the relevant sources, and expect one of three outcomes: success, failure, or human review.

   How we address it now:
   - Start with templates for SaaS/digital goods.
   - Template sections: customer identity, payment, signup, usage, delivery, refund/cancellation/support history, screenshots/outputs.
   - Agent output must be structured facts with source references.
   - Rendering and Stripe submission stay deterministic.

4. **Can the system correctly decide when evidence is good enough, missing, or needs human input?**

   Current stance: The product must not force weak evidence into a polished PDF. Weak data should be surfaced as a product state, not hidden by AI prose.

   How we address it now:
   - Every packet gets a decision state: `ready`, `blocked`, or `needs_human_input`.
   - Missing facts become explicit gaps: no usage match, no delivery proof, missing policy, no refund history, expired connector, or unsupported dispute reason.

5. **Can we earn enough trust for founders to connect Stripe and app data?**

   Current stance: Stripe + DB access is sensitive, even when read-only. The trust problem is part product UX, part security posture, part open-source credibility.

   How we address it now:
   - Make scopes explicit.
   - Default to read-only app data.
   - Support self-hosted/open-source path.
   - Show exactly what data was read.
   - Show a dry evidence packet before asking for autopilot trust.

6. **Can connector auth and tool sessions remain usable for asynchronous dispute processing?**

   Current stance: Disputes are event-driven and may arrive long after setup. OAuth refresh tokens, API keys, MCP sessions, database credentials, and vendor tokens can expire, rotate, lose scopes, or fail mid-case.

   How we address it now:
   - Persist durable credentials where possible.
   - Never depend on in-memory MCP sessions.
   - Run scheduled connector health checks.
   - Mark cases resumable.
   - Pause risky submission when access breaks.
   - Notify the founder with one repair action.

7. **Are our pricing and margin assumptions actually true in production?**

   Current stance: The cost model assumes Gemma-class models can do the job, token usage stays near the modeled budget, cache/retry behavior is reasonable, and non-LLM costs do not dominate. Any of those can break margin.

   How we address it now:
   - Measure real packet-generation runs.
   - Track model success rate, input/output tokens, retries, tool calls, PDF/image/storage costs, connector failures, and human review time.
   - Price around observed cost per completed packet, not spreadsheet-only estimates.

## Initial ICP

Start with merchants where the Levels/Tibo workflow is most likely to work.

- Stripe-native SaaS, AI, prosumer, and digital-product founders.
- Active or recent disputes.
- App usage/activity data exists in a database.
- Dispute value is high enough, or monthly dispute volume is painful enough.

## Initial Offer

The first offer should be outcome-shaped:

> Riposte turns your Stripe dispute and app activity logs into a Stripe-ready evidence packet.

The offer is not broad "chargeback automation." It is a concrete packet for a concrete dispute, built from the customer's own product data.

## Distribution

Distribution loops:

- Search public pain daily: Reddit, X, Indie Hackers, Hacker News, founder Slack/Discord groups.
- Track exact keywords: `Stripe dispute`, `chargeback`, `lost dispute`, `unfair dispute`, `Stripe held funds`, `friendly fraud`, `customer disputed`, `Stripe evidence`.
- Reply where public help is allowed with a tactical answer, then offer to build the evidence packet.
- DM founders who posted recent dispute pain with a concrete, low-friction ask: one dispute, one customer, one packet.
- Post teardown content: "I rebuilt the Levels/Tibo Stripe dispute responder as a reusable agent" plus real packet screenshots.
- Build a small list of Stripe-heavy SaaS/AI tools and contact founders/operators directly.
- Use each completed packet as proof: before/after evidence, time saved, submitted/won/lost outcome.

## Positioning

Positioning:

- Not "AI chargeback platform."
- Not "connect anything."
- Not "guaranteed wins."
- Yes: "Your app already has the proof. Riposte turns it into evidence."

## Core User Journey

1. Founder signs in.
2. Founder connects Stripe.
3. Founder connects read-only app data.
4. Founder adds product/policy context.
5. Riposte runs a dry test on a real or sample customer.
6. Founder sees the dispute inbox.
7. Founder opens a dispute case.
8. Riposte shows evidence facts, packet preview, and generated Stripe fields.
9. Founder submits evidence or marks the case for manual review.
10. Riposte records submission status and notifies the founder.

## Product Surfaces

These should map directly to Storybook pencil mocks first.

| Surface | Purpose |
| --- | --- |
| Control room | Autopilot/review status, setup health, active cases, recent outcomes |
| Connect systems | Stripe, database, policies, notifications, billing later |
| Dry test | Prove Riposte can match a Stripe customer to app activity |
| Dispute inbox | Filterable list of disputes, statuses, reasons, due dates, evidence state |
| Case detail | Facts, timeline, evidence packet, decision, logs, submission state |
| Evidence packet preview | PDF-like artifact the founder can inspect before submit |
| Breakage recovery | Explain missing permissions, broken DB access, weak evidence, failed submit |

## Evidence Packet

The packet should be deterministic first. AI can write short argument text, but must not invent facts.

Minimum packet sections:

- Customer and payment summary.
- Product/service description.
- Usage summary.
- Activity timeline.
- Recent delivered outputs or screenshots when available.
- Refund/cancellation/support history.
- Stripe evidence fields to be submitted.

## Automation Policy

MVP defaults to review-first.

Open states:

- `draft`: evidence is still being collected.
- `ready_for_review`: packet is complete enough for founder review.
- `submitted`: evidence was submitted to Stripe.
- `blocked`: required data or permission is missing.
- `won` / `lost`: Stripe dispute outcome.

Autopilot can come later once review-first behavior is trusted.

## Data Model Draft

Stub entities:

- `Workspace`
- `Connector`
- `DisputeCase`
- `EvidencePacket`
- `EvidenceFact`
- `Submission`
- `Notification`
- `HealthCheck`

## Open Questions

- Is MVP strictly review-first, or do we include an explicit autopilot toggle?
- Is first data source Postgres only?
- Do we use Stripe OAuth first, or restricted API key first?
- Do we generate real PDFs in MVP, or a structured preview before PDF generation?
- What are the first supported dispute reasons: fraudulent, product_not_received, subscription_canceled?
- What confidence/evidence score is useful without becoming fake precision?
- What exact action closes the MVP loop: submit to Stripe, or prepare packet only?
