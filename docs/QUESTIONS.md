---
source: "[[Create an Anthropic Agent with BitGo infra]]"
created: 2026-02-18
---

# Open Questions: DeFi Custody Agent

## Must Resolve Before Building

### 1. BitGo Testnet Coin Identifier
**Question:** Is Sepolia ETH represented as `teth` or `tsep` in BitGo's API?
**Impact:** Affects all BitGo API calls — wallet creation, tx requests, webhooks.
**To resolve:** Create a test wallet on `app.bitgo-test.com` and check the coin field.
**Wallet ID:** `69969602260606c19f6acff712efecfa`



### 2. Agent Hosting Architecture
**Question:** Where does the Python agent process run?
**Options:**
- **A: Vercel Python runtime** — simplest deployment, but cold starts + 10s timeout on hobby plan
- **B: Separate service (Railway/Render)** — more control, persistent process, adds infra
- **C: Subprocess from Next.js API route** — ClaudeSDKClient spawns CLI subprocess; may hit Vercel limits
**Recommendation:** Start with option A for MVP. If timeout is an issue, move to B.

### 3. BitGo Webhook Signature Verification
**Question:** How does BitGo sign webhook payloads? What's the verification scheme?
**Impact:** Security — without verification, anyone could POST fake approval events.
**To resolve:** Check BitGo developer docs for webhook verification section.

### 4. Testnet Funding
**Question:** Where to get Sepolia ETH and Aave test tokens?
**Known sources:**
- Sepolia ETH: various faucets (Alchemy, Infura, PoW faucet)
- Aave test tokens: Aave app testnet faucet (enable testnet mode at app.aave.com)
**To resolve:** Verify faucets work and fund the BitGo wallet.

### 5. SSE vs WebSocket for Agent Streaming
**Question:** Is Server-Sent Events sufficient, or do we need WebSocket for bidirectional communication?
**Current assessment:** SSE is sufficient — the flow is unidirectional (agent → UI). User input only happens at the start (form submit) and at approval (in BitGo, not in our UI).
**Decision:** Use SSE unless a bidirectional need emerges.

## Nice to Resolve

### 6. Demo Mode vs Live Mode
**Question:** Should the demo include a "simulation mode" that doesn't require BitGo testnet credentials?
**Reasoning:** Demo viewers may not have BitGo accounts. A mock mode with realistic-looking responses could make the demo more accessible.
**Decision:** Defer to post-MVP. For now, require real testnet credentials.

### 7. Agent Model Selection
**Question:** Which Claude model for the agent? Sonnet 4.6 (faster, cheaper) vs Opus 4.6 (more capable)?
**Assessment:** For a demo, reasoning quality matters more than latency. Opus for the risk evaluation, Sonnet for simple tool calls.
**Decision:** Start with Sonnet 4.6 for speed; upgrade to Opus if reasoning quality is insufficient.
