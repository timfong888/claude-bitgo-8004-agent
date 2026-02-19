---
source: "[[Create an Anthropic Agent with BitGo infra]]"
created: 2026-02-18
---

# Engineering Specification: DeFi Custody Agent

## System Architecture

### Component Overview

```
Next.js App (Vercel)
├── Frontend (React)
│   ├── pages/index.tsx          — Main demo UI
│   ├── components/
│   │   ├── RequestForm.tsx      — Borrow request input
│   │   ├── AgentReasoning.tsx   — Streaming agent thinking
│   │   ├── TransactionStatus.tsx— Lifecycle tracker
│   │   └── ArchitectureLabel.tsx— "Handled by: [BitGo|Agent]" badges
│   └── hooks/
│       └── useAgentStream.ts    — SSE hook for agent responses
│
├── API Routes (Next.js serverless)
│   ├── /api/agent/evaluate      — POST: start agent evaluation
│   ├── /api/agent/stream        — GET (SSE): stream agent reasoning
│   ├── /api/bitgo/status        — GET: pending approval status
│   └── /api/bitgo/webhook       — POST: BitGo webhook receiver
│
└── Agent Backend (Python, separate service or serverless)
    ├── agent.py                 — ClaudeSDKClient orchestration
    ├── tools/
    │   ├── aave_tools.py        — Aave V3 interaction tools
    │   ├── bitgo_tools.py       — BitGo API tools
    │   └── risk_tools.py        — Risk evaluation tools
    └── guardrails.py            — PreToolUse hooks for safety
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 14 + React | Vercel deployment, SSR for demo, API routes |
| Styling | Tailwind CSS | Fast prototyping, clean demo aesthetic |
| Agent | Anthropic Agent SDK (Python) | Native Claude integration with tools + hooks |
| Agent-Frontend bridge | SSE (Server-Sent Events) | Stream agent reasoning to UI in real-time |
| Blockchain | ethers.js v6 / viem | Aave contract interaction, calldata encoding |
| Custody | BitGo SDK (@bitgo/sdk-core) | Wallet, transaction, policy, webhook APIs |
| Deployment | Vercel | Frontend + API routes; agent as serverless or sidecar |

## Aave V3 Sepolia Integration

### Contract Addresses

| Contract | Address |
|----------|---------|
| Pool Addresses Provider | `0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A` |
| Pool (Lending/Borrowing) | `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951` |
| Pool Configurator | `0x7Ee60D184C24Ef7AfC1Ec7Be59A0f448A0abd138` |
| Oracle | `0x2da88497588bf89281816106C7259e31AF45a663` |
| Pool Data Provider | `0x3e9708d80f7B3e43118013075F7e95CE3AB31F31` |

### Token Addresses (Sepolia)

| Token | Address |
|-------|---------|
| WETH | `0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c` |
| USDC | `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8` |
| DAI | `0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357` |
| WBTC | `0x29f2D40B0605204364af54EC677bD022dA425d03` |
| USDT | `0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0` |
| AAVE | `0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a` |
| GHO | `0xc4bF5CbDaBE595361438F8c6a187bDc330539c60` |

### Required ABIs

1. **IPool** — `supply()`, `borrow()`, `getUserAccountData()`
2. **IPoolDataProvider** — `getUserReserveData()`, `getReserveData()`
3. **IPriceOracle** — `getAssetPrice()`
4. **IERC20** — `approve()`, `balanceOf()`, `allowance()`

### Borrow Flow Contract Calls

```
1. WETH.approve(Pool, amount)         — approve collateral spend
2. Pool.supply(WETH, amount, onBehalfOf, 0) — deposit collateral
3. Pool.getUserAccountData(user)      — check health factor
4. Pool.borrow(USDC, amount, 2, 0, onBehalfOf) — variable rate borrow
```

## BitGo Testnet Integration

### Setup Requirements

1. **BitGo Test Account** — Register at `app.bitgo-test.com`
2. **API Access Token** — Generate via Settings → Developer Options
3. **Test Wallet** — Create an Ethereum Sepolia wallet
4. **Policy Rules** — Configure at least:
   - Amount threshold (e.g., reject > 1 ETH without approval)
   - Address allowlist (only Aave Pool contract)
   - Required approvers (at least 1)

### API Endpoints Used

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Create tx request | POST | `/api/v2/{coin}/wallet/{walletId}/txrequests` |
| Sign transaction | POST | `/api/v2/{coin}/wallet/{walletId}/txrequests/{requestId}/sign` |
| Send transaction | POST | `/api/v2/{coin}/wallet/{walletId}/txrequests/{requestId}/send` |
| List pending approvals | GET | `/api/v2/pendingapprovals` |
| Get pending approval | GET | `/api/v2/pendingapprovals/{approvalId}` |
| Update approval | PUT | `/api/v2/pendingapprovals/{approvalId}` |
| Add wallet webhook | POST | `/api/v2/{coin}/wallet/{walletId}/webhooks` |

### Authentication

```
Authorization: Bearer $BITGO_ACCESS_TOKEN
```

All requests to `https://app.bitgo-test.com/api/v2/...` for testnet.

### Webhook Configuration

Register a webhook for `pendingapproval` events:

```json
{
  "type": "pendingapproval",
  "url": "https://<vercel-app>.vercel.app/api/bitgo/webhook",
  "numConfirmations": 0
}
```

## Anthropic Agent SDK Integration

### Agent Configuration

```python
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    tool,
    create_sdk_mcp_server,
    HookMatcher
)

SYSTEM_PROMPT = """You are a DeFi risk analyst agent. Your role is to evaluate
lending/borrowing transactions on Aave V3 for institutional clients.

HARD RULES (never override):
- REFUSE any transaction where projected health factor < 1.0
- REFUSE interaction with non-allowlisted contracts
- FLAG infinite token approvals (amount > 10x needed)
- FLAG health factor between 1.0 and 1.5 as HIGH RISK

For every evaluation, you MUST:
1. Decode the transaction calldata in plain language
2. Calculate the projected health factor after the transaction
3. Assess liquidation risk at current and -20% collateral price
4. Provide a risk score: LOW / MEDIUM / HIGH / BLOCKED
5. Explain your reasoning step by step

You construct transactions but NEVER sign them. BitGo handles signing
and policy enforcement. Your role is advisory and constructive."""
```

### Custom Tools (MCP)

#### aave_health_check

```python
@tool(
    "aave_health_check",
    "Query Aave V3 Pool for user account data including health factor",
    {
        "user_address": str,  # Ethereum address to check
    }
)
async def aave_health_check(args):
    """Calls Pool.getUserAccountData() and returns:
    - totalCollateralBase (USD)
    - totalDebtBase (USD)
    - availableBorrowsBase (USD)
    - currentLiquidationThreshold
    - ltv
    - healthFactor (18 decimals)
    """
```

#### decode_calldata

```python
@tool(
    "decode_calldata",
    "Decode EVM transaction calldata into human-readable format",
    {
        "to": str,        # Target contract address
        "data": str,      # Hex-encoded calldata
        "value": str,     # Wei value (optional, default "0")
    }
)
async def decode_calldata(args):
    """Decodes calldata against known ABIs (Aave Pool, ERC20).
    Returns: function name, parameters, plain-language explanation."""
```

#### submit_to_bitgo

```python
@tool(
    "submit_to_bitgo",
    "Submit a transaction request to BitGo for custody and signing",
    {
        "to": str,        # Target contract
        "data": str,      # Encoded calldata
        "value": str,     # Wei value
        "risk_score": str, # Agent's risk assessment
        "reasoning": str,  # Agent's explanation
    }
)
async def submit_to_bitgo(args):
    """Creates a BitGo transaction request.
    Returns: txRequestId, pendingApprovalId (if policy triggered)."""
```

#### get_approval_status

```python
@tool(
    "get_approval_status",
    "Check the status of a BitGo pending approval",
    {
        "approval_id": str,
    }
)
async def get_approval_status(args):
    """Returns: state (pending/approved/rejected), approvers, policy that triggered."""
```

### Guardrail Hooks

```python
async def guardrail_hook(input_data, tool_use_id, context):
    """PreToolUse hook that enforces deterministic safety rules."""
    tool_name = input_data["tool_name"]
    tool_input = input_data["tool_input"]

    if tool_name == "submit_to_bitgo":
        risk = tool_input.get("risk_score", "")
        if risk == "BLOCKED":
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason":
                        "Transaction blocked by guardrail: risk score is BLOCKED"
                }
            }
        # Verify target is allowlisted
        to_address = tool_input.get("to", "").lower()
        if to_address not in ALLOWLISTED_CONTRACTS:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason":
                        f"Contract {to_address} not in allowlist"
                }
            }
    return {}

options = ClaudeAgentOptions(
    system_prompt=SYSTEM_PROMPT,
    mcp_servers={"defi": defi_tools_server},
    allowed_tools=[
        "mcp__defi__aave_health_check",
        "mcp__defi__decode_calldata",
        "mcp__defi__submit_to_bitgo",
        "mcp__defi__get_approval_status",
    ],
    hooks={
        "PreToolUse": [
            HookMatcher(
                matcher="mcp__defi__submit_to_bitgo",
                hooks=[guardrail_hook]
            )
        ]
    }
)
```

## API Contracts

### POST /api/agent/evaluate

**Request:**
```json
{
  "action": "borrow",
  "collateral_token": "WETH",
  "collateral_amount": "0.5",
  "borrow_token": "USDC",
  "borrow_amount": "500",
  "wallet_address": "0x..."
}
```

**Response:** SSE stream with events:
```
event: thinking
data: {"step": "Checking current health factor...", "timestamp": "..."}

event: tool_call
data: {"tool": "aave_health_check", "result": {"healthFactor": "2.1", ...}}

event: risk_assessment
data: {"score": "MEDIUM", "healthFactor": "1.45", "reasoning": "..."}

event: transaction_submitted
data: {"txRequestId": "...", "pendingApprovalId": "..."}

event: approval_status
data: {"state": "pending", "policy": "amount_threshold", "requiredApprovers": 1}

event: complete
data: {"txHash": "0x...", "status": "confirmed"}
```

### GET /api/bitgo/status?approvalId={id}

**Response:**
```json
{
  "id": "...",
  "state": "pending",
  "creator": "agent",
  "createDate": "2026-02-18T...",
  "info": {
    "type": "transactionRequest",
    "transactionRequest": { "..." }
  },
  "resolvers": [
    { "user": "...", "date": "...", "resolution": "approved" }
  ]
}
```

### POST /api/bitgo/webhook

**BitGo sends:**
```json
{
  "type": "pendingapproval",
  "pendingApprovalId": "...",
  "state": "approved",
  "walletId": "..."
}
```

## Data Flow: End-to-End Borrow

```
User                UI              API Route          Agent            BitGo           Aave
 │                   │                  │                │                │               │
 │ Enter borrow req  │                  │                │                │               │
 │─────────────────→│                  │                │                │               │
 │                   │ POST /evaluate   │                │                │               │
 │                   │────────────────→│                │                │               │
 │                   │                  │ Start agent    │                │               │
 │                   │                  │───────────────→│                │               │
 │                   │                  │                │                │               │
 │                   │  SSE: thinking   │                │ health check   │               │
 │                   │←────────────────│←───────────────│───────────────────────────────→│
 │                   │                  │                │                │               │
 │  Show reasoning   │  SSE: risk      │                │ decode tx      │               │
 │←─────────────────│←────────────────│←───────────────│                │               │
 │                   │                  │                │                │               │
 │                   │                  │                │ submit_to_bitgo│               │
 │                   │                  │                │───────────────→│               │
 │                   │                  │                │                │               │
 │                   │ SSE: submitted   │                │ pending approval               │
 │←─────────────────│←────────────────│←───────────────│←───────────────│               │
 │                   │                  │                │                │               │
 │  Approve in BitGo │                  │                │                │               │
 │──────────────────────────────────────────────────────────────────────→│               │
 │                   │                  │                │                │               │
 │                   │ Webhook: approved│                │                │  sign + send  │
 │                   │←────────────────│←───────────────────────────────│──────────────→│
 │                   │                  │                │                │               │
 │  Show confirmation│  SSE: complete  │                │                │               │
 │←─────────────────│←────────────────│                │                │               │
```

## Environment Variables

```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# BitGo Testnet
BITGO_ACCESS_TOKEN=v2x...
BITGO_WALLET_ID=69969602260606c19f6acff712efecfa
BITGO_COIN=teth        # Sepolia testnet ETH on BitGo

# Aave Sepolia
NEXT_PUBLIC_AAVE_POOL=0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951
NEXT_PUBLIC_SEPOLIA_RPC=https://sepolia.infura.io/v3/...

# App
NEXT_PUBLIC_APP_URL=https://<app>.vercel.app
```

## Playwright Test Plan

### Core E2E Test: Borrow Flow

```typescript
test('full borrow flow: request → agent evaluation → BitGo approval → confirmation', async ({ page }) => {
  // 1. Navigate to app
  await page.goto('/');

  // 2. Fill borrow request form
  await page.fill('[data-testid="collateral-amount"]', '0.5');
  await page.fill('[data-testid="borrow-amount"]', '500');
  await page.click('[data-testid="submit-request"]');

  // 3. Verify agent reasoning appears
  await expect(page.locator('[data-testid="agent-thinking"]')).toBeVisible();
  await expect(page.locator('[data-testid="risk-score"]')).toBeVisible();

  // 4. Verify transaction submitted to BitGo
  await expect(page.locator('[data-testid="tx-status"]')).toContainText('Pending Approval');

  // 5. Verify architecture labels
  await expect(page.locator('[data-testid="label-agent"]')).toContainText('Anthropic Agent');
  await expect(page.locator('[data-testid="label-bitgo"]')).toContainText('BitGo Custody');

  // 6. Simulate approval (via API or BitGo test interface)
  // 7. Verify confirmation
  await expect(page.locator('[data-testid="tx-status"]')).toContainText('Confirmed');
});
```

### Guardrail Tests

```typescript
test('agent blocks transaction with health factor < 1.0', async ({ page }) => {
  // Request borrow that would exceed safe ratio
  await page.fill('[data-testid="borrow-amount"]', '100000');
  await page.click('[data-testid="submit-request"]');

  await expect(page.locator('[data-testid="risk-score"]')).toContainText('BLOCKED');
  await expect(page.locator('[data-testid="agent-reasoning"]'))
    .toContainText('health factor');
  // Transaction should NOT be submitted to BitGo
  await expect(page.locator('[data-testid="tx-status"]')).not.toBeVisible();
});
```

## Open Questions

Preserved in `docs/QUESTIONS.md` for async resolution:

1. **BitGo testnet coin type** — Is Sepolia ETH `teth` or `tsep` in BitGo's API? Need to verify during wallet setup.
2. **Agent hosting** — Should the Python agent run as a Vercel serverless function (via Python runtime), a separate service (Railway/Render), or a subprocess spawned by the Next.js API route?
3. **Webhook verification** — BitGo webhook signature scheme for testnet — need to find docs on verifying webhook authenticity.
4. **Aave Sepolia faucet** — Need testnet ETH and WETH. Aave provides a faucet at `app.aave.com` in testnet mode — verify it works for Sepolia.
5. **SSE vs WebSocket** — SSE is simpler for unidirectional agent streaming. Is bidirectional needed for any flow?
