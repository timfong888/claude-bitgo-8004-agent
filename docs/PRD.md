---
source: "[[Create an Anthropic Agent with BitGo infra]]"
created: 2026-02-18
---

# PRD: DeFi Custody Agent — Anthropic + BitGo

## Problem Statement

Institutional DeFi participation is blocked by a trust gap: organizations need both **intelligent risk evaluation** (understanding what a transaction does before signing) and **policy-enforced custody** (ensuring only authorized transactions execute). Today these capabilities exist in isolation — AI agents lack custody infrastructure, and custodians lack AI-driven risk interpretation.

No product currently demonstrates an AI agent that:
1. Interprets DeFi protocol interactions in plain language
2. Evaluates risk using LLM-based reasoning (not just rule-based checks)
3. Routes transactions through institutional custody with policy enforcement
4. Surfaces its reasoning transparently for human approval

## User Personas

### Primary: Institutional DeFi Operator
- Works at a crypto fund, DAO treasury, or enterprise with DeFi exposure
- Needs to execute lending/borrowing strategies on Aave
- Requires multi-sig approval workflows and audit trails
- Wants plain-language explanations of complex DeFi transactions before signing

### Secondary: Security/Compliance Reviewer
- Reviews pending transactions for policy compliance
- Needs risk scores, decoded calldata, and health factor analysis
- Approves/rejects in BitGo Verify (mobile or web)

### Tertiary: Demo Audience (Anthropic, BitGo, 8004)
- Evaluates the product as a proof-of-concept
- Needs to understand the architecture through the UI without reading code
- Wants to see the agent "think" and the custody layer "enforce"

## Key User Stories

### Core Flow: Borrow USDC Against ETH Collateral

**As an** institutional DeFi operator,
**I want to** request a borrow of USDC against my ETH collateral on Aave,
**So that** I can access liquidity while my agent evaluates risk and my custodian enforces policy.

**Acceptance criteria:**
1. I enter a borrow amount and see the agent's risk assessment before anything is signed
2. The agent shows me: health factor, collateral ratio, liquidation price, gas estimate
3. If the agent flags risk (e.g., health factor < 1.5), it warns me and explains why
4. The transaction routes to BitGo where my organization's policy rules evaluate it
5. I see the pending approval status and can approve in BitGo
6. On approval, the transaction executes on-chain and I see confirmation
7. The full lifecycle is visible in the UI with timestamps

### Safety Guardrails

**As a** compliance reviewer,
**I want** the agent to refuse dangerous transactions deterministically,
**So that** AI-powered automation doesn't bypass institutional safeguards.

**Acceptance criteria:**
1. Agent blocks transactions that would result in health factor < 1.0
2. Agent flags infinite token approvals and explains the risk
3. Agent refuses to interact with non-allowlisted contracts
4. All agent decisions include reasoning that can be audited
5. BitGo policy rules independently enforce: amount thresholds, allowlisted addresses, required approvers

### Demo Walkthrough

**As a** demo viewer,
**I want to** walk through the borrow flow step-by-step,
**So that** I understand what each layer (AI agent, custodian, protocol) contributes.

**Acceptance criteria:**
1. UI has a guided mode that highlights each step
2. Agent thinking is visible (not just final output)
3. BitGo policy evaluation result is displayed
4. Architecture labels show which system handles each step

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Web UI (Next.js)                     │
│  ┌──────────┐  ┌───────────────┐  ┌──────────────────────┐ │
│  │ Request   │  │ Agent         │  │ Transaction          │ │
│  │ Form      │→ │ Reasoning     │→ │ Status + Approval    │ │
│  │           │  │ Panel         │  │ Tracker              │ │
│  └──────────┘  └───────────────┘  └──────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ API Routes
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Agent Backend (Python)                     │
│                                                             │
│  ┌──────────────────┐  ┌─────────────────────────────────┐ │
│  │ Anthropic Agent   │  │ Custom Tools (MCP)              │ │
│  │ SDK               │  │                                 │ │
│  │ - ClaudeSDKClient │  │ - aave_health_check             │ │
│  │ - PreToolUse hook │  │ - decode_calldata               │ │
│  │ - System prompt   │  │ - estimate_gas                  │ │
│  │   with guardrails │  │ - check_allowlist               │ │
│  └──────────────────┘  │ - submit_to_bitgo               │ │
│                         │ - get_approval_status            │ │
│                         └─────────────────────────────────┘ │
└────────────┬───────────────────────────────┬────────────────┘
             │                               │
             ▼                               ▼
┌────────────────────────┐    ┌──────────────────────────────┐
│   Aave V3 (Sepolia)    │    │   BitGo (Testnet)            │
│                        │    │                              │
│ - Pool: 0x6Ae43d...    │    │ - Wallet webhooks            │
│ - Supply ETH collateral│    │ - Pending approvals API      │
│ - Borrow USDC          │    │ - Policy engine              │
│ - Health factor query  │    │ - Transaction signing        │
│                        │    │ - Approval workflow          │
└────────────────────────┘    └──────────────────────────────┘
```

## Risk Model: Three Layers of Safety

| Layer | Owner | What It Checks | How It Enforces |
|-------|-------|---------------|-----------------|
| **AI Risk Evaluation** | Anthropic Agent | Health factor, collateral ratio, liquidation risk, contract allowlist, infinite approval detection | Agent refuses to construct transaction + explains reasoning in UI |
| **Institutional Policy** | BitGo | Amount thresholds, address allowlists, required approver count, velocity limits | Transaction blocked at custody layer; requires human approval in BitGo Verify |
| **Human Approval** | Operator | Final review of agent reasoning + BitGo policy result | Approve/reject in BitGo Verify (mobile or web) |

**Key design principle:** The AI agent is *advisory and constructive* — it evaluates, explains, and constructs. BitGo is *authoritative and custodial* — it enforces and signs. Neither layer alone is sufficient; together they provide defense-in-depth.

## Scope

### In Scope (MVP)
- Single borrow flow: supply ETH → borrow USDC on Aave V3 Sepolia
- Agent risk evaluation with visible reasoning
- BitGo testnet custody with at least one policy rule triggering approval
- Web UI showing full lifecycle
- Playwright-testable end-to-end flow
- Vercel deployment

### Out of Scope (Post-MVP)
- Multiple DeFi protocols (Compound, Uniswap)
- Repayment and liquidation flows
- WalletConnect integration (Path 2 from research)
- Multi-wallet support
- Production mainnet deployment
- Mobile-responsive UI

## Success Metrics

| Metric | Target |
|--------|--------|
| Demo walkthrough time | < 5 minutes without developer context |
| Agent reasoning visible | At every decision point in the flow |
| BitGo policy trigger | At least 1 approval gate fires during demo |
| Playwright test | Covers full borrow flow end-to-end |
| Deployment | Live on Vercel with public URL |
