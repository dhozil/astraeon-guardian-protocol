<div align="center">

<img src="./public/logo.svg" width="110" height="110" alt="Astraeon logo — a classical temple emblem in antique gold" />

# ASTRAEON

### The programmable trust & execution layer for autonomous AI agents.

_Autonomy without enforceable boundaries is not infrastructure._

**Astraeon gives agents the power to act — without giving them unlimited power.**

<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" />
<img alt="React" src="https://img.shields.io/badge/React%2019-61DAFB?style=flat-square&logo=react&logoColor=111" />
<img alt="TanStack Start" src="https://img.shields.io/badge/TanStack%20Start-000?style=flat-square&logo=tanstack&logoColor=white" />
<img alt="Built on Rialo" src="https://img.shields.io/badge/Built%20on%20Rialo-c9a85c?style=flat-square&logoColor=white" />
<img alt="Vitest" src="https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white" />
<img alt="Vercel" src="https://img.shields.io/badge/Vercel-000?style=flat-square&logo=vercel&logoColor=white" />

</div>

---

## The Thesis

AI agents are becoming autonomous economic actors: they read APIs, move money, interact with DeFi, talk to other agents, and act in the real world. Every bit of that autonomy is attack surface — prompt injection, leaked credentials, runaway spending, malicious tool output.

Astraeon is the layer between an agent and the real world that makes every action **bounded, auditable, and enforceable**:

```
AGENT
  │
  ▼
ASTRAEON   identity → permission → policy → risk → credentials → execution → audit
  │
  ▼
RIALO      confidential execution, payments, automation, on-chain state
  │
  ▼
WORLD      APIs · DeFi · Web2 · payments · other agents
```

Astraeon does not replace agents. It is the trust infrastructure that lets agents act safely in the world.

---

## What it does

| Capability               | What it means                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| **Agent Identity**       | Every agent gets a verifiable identity and delegated, scoped authority.                       |
| **Policy Engine**        | Declarative boundaries: assets, amounts, budgets, velocity, slippage, destinations.           |
| **Risk Engine**          | Scores every action 0–100 before execution (SAFE → CRITICAL).                                 |
| **Credential Gateway**   | Agents ask for a path; Astraeon binds the vaulted credential. Raw keys never reach the model. |
| **Transaction Guard**    | Decode → policy → risk → simulate → approve/deny, with explainable reasons.                   |
| **Spending & Velocity**  | Per-tx / daily / weekly / monthly caps and request-rate limits.                               |
| **Anomaly Detection**    | Velocity bursts, critical-risk actions, policy escapes → auto-pause.                          |
| **Emergency Brake**      | Pause, resume, or revoke an agent instantly.                                                  |
| **Audit Trail**          | Every action recorded — and **verifiable on-chain** against the Rialo node.                   |
| **Reputation**           | A trust tier derived from verifiable behavior, not claims.                                    |
| **Human-in-the-Loop**    | High-value actions route to approvals before execution.                                       |
| **Wallet-gated actions** | Viewing is open to everyone; on-chain actions create (and sign with) the operator wallet.     |

---

## Real on-chain execution (Rialo DevNet)

Astraeon is not a mockup. The engine talks to the **Rialo DevNet** node (`devnet.rialo.io:4100`) via JSON-RPC:

- **Wallet** — Ed25519 keypair (base58), generated in the browser.
- **Signed transactions** — a System-Program transfer built to the exact Rialo wire format, signed with the operator's key, submitted with `sendTransaction`, confirmed with `getSignatureStatuses`.
- **Guard program on-chain** — the Astraeon guard is **deployed and live** on DevNet
  (`EiKYpXrsCBU2ZqbCpLuLBPGfjFzBwt1ynsqNLdHAnA97`). When `VITE_RIALO_GUARD_PROGRAM` is set (it defaults to the deployed program), execution invokes the program's `evaluate(...)` instruction, so the allow/deny decision comes from the chain, not the frontend.
- Execution amount is tied to the action (`amountUsd → kelvins`, floored at the DevNet dust minimum).
- Audit events carrying a real transaction hash can be **verified on-chain** (`getTransaction` → block, fee, program logs).
- The Rialo node is HTTP-only and sends no CORS headers, so a **same-origin proxy** at `/api/rialo` (`src/server.ts`) forwards JSON-RPC server-side.

Everything degrades gracefully to simulation when the node is unreachable, so the product still demos fully offline.

---

## Security model

> **Astraeon holds no keys.** The wallet belongs to the operator of the console; the app signs on their behalf only after the console is unlocked.

- **Viewing is open; acting needs a wallet** — browsing the dashboards requires nothing. The operator wallet (Ed25519) is created automatically in the browser on the first on-chain action, so no login or wallet-connection step stands between a visitor and the demo.
- **Key persistence is opt-in** — by default the signing key lives in memory for the session; "remember key" (browser storage) is a labelled, insecure-for-production convenience for demo flows.
- **Faucet abuse controls** — auto-funding is throttled, execution is cooldown-gated, and in-flight locks prevent double-transfers.
- **Tamper resistance** — local state is schema-validated on load so manipulated browser storage cannot inject agents or policies.

---

## Tech stack

| Area           | Choice                                                                         |
| -------------- | ------------------------------------------------------------------------------ |
| Framework      | **TanStack Start** (React 19 + Vite) with SSR                                  |
| Styling        | **Tailwind CSS v4** — classical-trust-meets-machine-intelligence design system |
| Language       | **TypeScript** (strict)                                                        |
| Engine tests   | **Vitest**                                                                     |
| Build / deploy | **Nitro** (preset `vercel`) → Vercel Build Output API                          |

```
src/
  components/
    astraeon/        # landing page sections
    command-center/  # the interactive product UI
    ui/              # shadcn/ui primitives
  lib/astraeon/      # the engine (pure, testable)
    risk.ts          # risk scoring
    policy.ts        # policy + spending/velocity evaluation
    guard.ts         # the transaction guard orchestrator
    vault.ts         # credential gateway
    rialo.ts         # JSON-RPC transport + executor
    tx.ts            # Rialo wire-format transaction builder
    wallet.ts        # Ed25519 wallet + base58
    reputation.ts    # agent reputation
    store.tsx        # React state (operator, agents, policies, audit)
  routes/
    command-center.tsx
    index.tsx
  server.ts          # SSR wrapper + /api/rialo JSON-RPC proxy
tests/               # vitest suite
```

---

## Getting started

Requires Node.js **>= 20**.

```sh
git clone https://github.com/dhozil/astraeon-guardian-protocol.git
cd astraeon-guardian-protocol
npm install
npm run dev        # http://localhost:8080
```

Open **Command Center** → run the **Guided Demo** (create agent → buy → withdraw blocked → velocity burst → pause). Your operator wallet is created automatically on the first on-chain action.

Checks:

```sh
npm test          # vitest engine tests
npm run lint      # eslint
npm run build     # production build → .vercel/output
```

---

## Environment variables

| Variable                   | Purpose                                                                                                           | Default                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `RIALO_RPC_URL`            | Upstream Rialo RPC for the server proxy                                                                           | `http://devnet.rialo.io:4100` |
| `VITE_RIALO_RPC_URL`       | Client override; leave unset for the same-origin proxy                                                            | `/api/rialo`                  |
| `VITE_RIALO_GUARD_PROGRAM` | Base58 address of the deployed guard program; when set, execution calls `evaluate` on-chain instead of a transfer | (unset)                       |

---

## Deploy to Vercel

The build targets Vercel's Build Output API (nitro preset `vercel`, `vercel.json`).

1. Push to GitHub, then **Import** the repository at [vercel.com/new](https://vercel.com/new).
2. Vercel picks up `vercel.json` → `npm run build` → `.vercel/output`.
3. Set env vars as needed (defaults work out of the box).
4. Deploy.

---

## Roadmap

- **V2** — multi-agent permissions, agent-to-agent authorization, subscriptions, marketplace, escrow / agent labor, simulation previews.
- **V3** — policy marketplace, gateway marketplace, enterprise controls, RWA automation, DeFi autonomous management, an agent SDK (`@astraeon/*`).
- **Production custody** — replace the in-browser signer with user-owned wallets / delegated authority + an on-chain guard program on Rialo, so trust comes from verifiability rather than a single operator.

---

<div align="center">

<img src="./public/logo.svg" width="56" height="56" alt="Astraeon logo" />

**Astraeon is the trust infrastructure for the autonomous economy.**

_AI intelligence + Astraeon trust + Rialo execution = autonomous economic infrastructure._

</div>
