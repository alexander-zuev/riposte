## Riposte

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-orange.svg)]()
[![Deploy to Cloudflare Workers](https://img.shields.io/badge/Deploy_to-Cloudflare_Workers-F38020.svg?logo=cloudflare)](https://developers.cloudflare.com/workers/)
[![CI](https://github.com/alexander-zuev/riposte/actions/workflows/ci.yaml/badge.svg)](https://github.com/alexander-zuev/riposte/actions/workflows/ci.yaml)

[riposte.sh](https://riposte.sh) | Open-source AI agent that fights your Stripe disputes on autopilot

### 🚀 Getting started

**Cloud** — hosted setup at [riposte.sh](https://riposte.sh): connect Stripe, connect your data, done.

**Self-hosted** — run it on your own Cloudflare account. See Self-hosting below.

### 💸 Why

**Chargebacks are revenue you fight to win back** — hours per case, and most teams just eat the loss.

**Managed services take ~30% of what they recover**, on thin generic-payment-data evidence (looking at you Stripe Smart Disputes).

**Riposte wins them back automatically, with your data, no cut.** It reads what the customer actually did and received to answer the bank's only question: _did they get what they paid for?_

### ⚙️ How it works

```
CONNECT     Stripe + your data source (MCP)
   ↓
SETUP       the agent reads your schema and drafts your dispute playbook
   ↓
REVIEW      dry-run on a real dispute, you approve
   ↓
GO LIVE     every new dispute now runs automatically:
```

```
WEBHOOK     Stripe dispute opens
   ↓
ENRICH      pull the dispute context
   ↓
COLLECT     read your data via the playbook (MCP)
   ↓
GENERATE    build the evidence PDF
   ↓
SUBMIT      to Stripe   ·   approve-first optional (HITL)
```

### 🧱 Tech stack

| Layer         | What                                                         |
| ------------- | ------------------------------------------------------------ |
| Agent runtime | Cloudflare Workers + Agents SDK (Durable Objects, Workflows) |
| LLM           | Cloudflare Workers AI — Gemma 4, Kimi K2                     |
| Database      | Postgres via Hyperdrive                                      |
| Evidence PDF  | Deterministic renderer (structured layout, image resize)    |
| Submission    | Stripe Disputes API                                         |
| Notifications | Slack, Email                                                |

### 🏠 Self-hosting

Configure your Cloudflare bindings and secrets, then `wrangler deploy`. Not turnkey yet — see `docs/public`.

### 🤝 Contributing

Ideas and contributions welcome — open an issue to start.

### 📚 Docs

`docs/public` is open. `docs/private` (product research, launch planning, specs, screenshots) is git-crypt-encrypted and not part of the public distribution.

### ⚖️ License

AGPLv3
