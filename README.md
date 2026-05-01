## 🤺 Riposte

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Status: Early Development](https://img.shields.io/badge/Status-Early_Development-orange.svg)]()
[![Deploy to Cloudflare Workers](https://img.shields.io/badge/Deploy_to-Cloudflare_Workers-F38020.svg?logo=cloudflare)](https://developers.cloudflare.com/workers/)

Open-source AI agent that wins your Stripe disputes on autopilot.

### Why

**Disputes are existential.** Exceed 0.75% dispute rate and card networks put you in a monitoring program. If you can't bring it down, fines start (Mastercard: $5K/month escalating to $100K/month over 19+ months of non-compliance). Worst case: they cut you off from processing payments entirely.

**But fighting them is a losing game.** Collecting evidence takes hours per case. Every dispute costs $15, contest and lose = $30. Most businesses just eat the loss.

**Existing tools can't help.** They all pull generic payment data. None of them can access your app's database, user activity logs, or the actual product your customer received. That's why the evidence is shallow and win rates stay low.

**Riposte reads your actual data.** It queries your database for real user activity, pulls screenshots of what they received, and builds evidence that answers the only question the bank cares about: _"Did this person get what they paid for?"_

### How it works

**Cloud** — 1-click setup at [riposte.sh](https://riposte.sh). Connect Stripe, connect your DB, done.

**Self-hosted** — deploy to your own Cloudflare account:

```bash
git clone https://github.com/alexander-zuev/riposte
pnpm install && pnpm deploy
```

Both use the same agent. 90% deterministic, 10% AI.

```
1. CONNECT     Stripe key + DB connection + describe your product
                          ↓
2. DISCOVER    Agent reads your schema, finds user activity tables
                          ↓
3. AUTOPILOT   Webhook fires → pulls evidence → generates PDF → submits to Stripe
                          ↓
4. NOTIFY      Slack / Telegram / Discord / Email
```

### Tech stack

| Layer               | What                                                       |
| ------------------- | ---------------------------------------------------------- |
| Agent runtime       | Cloudflare Workers + Agents SDK                            |
| LLM                 | Claude via @ai-sdk/anthropic                               |
| DB access           | MCP (PlanetScale, Supabase, Postgres)                      |
| PDF generation      | Deterministic (structured layout, image resize, 5MB limit) |
| Evidence submission | Stripe Disputes API                                        |
| Notifications       | Slack / Telegram / Discord / Email                         |

### License

AGPLv3 — free to use, modify, and self-host. Hosted version coming soon.
