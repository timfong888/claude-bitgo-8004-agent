import Anthropic from "@anthropic-ai/sdk";
import {
  getUserAccountData,
  getAssetPrice,
  TOKENS,
  AAVE_CONTRACTS,
} from "./aave";
import type { AgentEvent, RiskScore, TokenSymbol } from "@/types";

const SYSTEM_PROMPT = `You are a DeFi risk analyst agent. Your role is to evaluate lending/borrowing transactions on Aave V3 for institutional clients.

HARD RULES (never override):
- REFUSE any transaction where projected health factor < 1.0
- REFUSE interaction with non-allowlisted contracts
- FLAG infinite token approvals (amount > 10x needed)
- FLAG health factor between 1.0 and 1.5 as HIGH RISK

ALLOWLISTED CONTRACTS:
- Aave V3 Pool: ${AAVE_CONTRACTS.pool}
- WETH: ${TOKENS.WETH}
- USDC: ${TOKENS.USDC}
- DAI: ${TOKENS.DAI}

For every evaluation, you MUST:
1. Check the user's current Aave position (health factor, collateral, debt)
2. Calculate the projected health factor AFTER the proposed transaction
3. Assess liquidation risk at current price and at -20% collateral price
4. Provide a risk score: LOW / MEDIUM / HIGH / BLOCKED
5. Explain your reasoning step by step in plain language

Risk score criteria:
- LOW: health factor >= 2.0 after transaction
- MEDIUM: health factor between 1.5 and 2.0
- HIGH: health factor between 1.0 and 1.5
- BLOCKED: health factor < 1.0 (refuse to proceed)

You construct transactions but NEVER sign them. BitGo handles signing and policy enforcement. Your role is advisory and constructive.

Respond in JSON format:
{
  "thinking": ["step 1...", "step 2...", ...],
  "riskScore": "LOW|MEDIUM|HIGH|BLOCKED",
  "healthFactor": "1.85",
  "collateralRatio": "185%",
  "liquidationPrice": "$1,200",
  "reasoning": "Plain language summary",
  "proceed": true|false,
  "transactions": [
    { "to": "0x...", "data": "0x...", "value": "0", "description": "..." }
  ]
}`;

const anthropic = new Anthropic();

export async function evaluateBorrowRequest(params: {
  walletAddress: string;
  collateralToken: TokenSymbol;
  collateralAmount: string;
  borrowToken: TokenSymbol;
  borrowAmount: string;
  onEvent: (event: AgentEvent) => void;
}) {
  const { walletAddress, collateralToken, collateralAmount, borrowToken, borrowAmount, onEvent } =
    params;

  const emitEvent = (type: AgentEvent["type"], data: Record<string, unknown>) => {
    onEvent({ type, timestamp: new Date().toISOString(), data });
  };

  // Step 1: Gather on-chain data
  emitEvent("thinking", { step: "Fetching current Aave position..." });

  let accountData;
  try {
    accountData = await getUserAccountData(walletAddress as `0x${string}`);
    emitEvent("tool_call", {
      tool: "aave_health_check",
      result: accountData,
    });
  } catch (error) {
    emitEvent("thinking", {
      step: "No existing Aave position found — this will be a new position",
    });
    accountData = {
      totalCollateralUSD: "0",
      totalDebtUSD: "0",
      availableBorrowsUSD: "0",
      currentLiquidationThreshold: 0,
      ltv: 0,
      healthFactor: "0",
    };
  }

  // Step 2: Get asset prices
  emitEvent("thinking", { step: "Fetching asset prices from Aave Oracle..." });

  const collateralAddress = TOKENS[collateralToken];
  const borrowAddress = TOKENS[borrowToken];

  let collateralPrice: string;
  let borrowPrice: string;
  try {
    [collateralPrice, borrowPrice] = await Promise.all([
      getAssetPrice(collateralAddress),
      getAssetPrice(borrowAddress),
    ]);
    emitEvent("tool_call", {
      tool: "oracle_prices",
      result: {
        [collateralToken]: collateralPrice,
        [borrowToken]: borrowPrice,
      },
    });
  } catch {
    // Fallback prices for demo if oracle call fails
    collateralPrice = collateralToken === "WETH" ? "2500" : "1";
    borrowPrice = "1";
    emitEvent("thinking", {
      step: "Using fallback prices (oracle unavailable on testnet)",
    });
  }

  // Step 3: Ask Claude to evaluate
  emitEvent("thinking", { step: "Running AI risk evaluation..." });

  const userMessage = `Evaluate this proposed Aave V3 borrow:

Current position:
- Total collateral: $${accountData.totalCollateralUSD}
- Total debt: $${accountData.totalDebtUSD}
- Current health factor: ${accountData.healthFactor}
- LTV: ${accountData.ltv}

Proposed transaction:
- Supply ${collateralAmount} ${collateralToken} as collateral (price: $${collateralPrice} each)
- Borrow ${borrowAmount} ${borrowToken} (price: $${borrowPrice} each)

Collateral value: $${(parseFloat(collateralAmount) * parseFloat(collateralPrice)).toFixed(2)}
Borrow value: $${(parseFloat(borrowAmount) * parseFloat(borrowPrice)).toFixed(2)}

Aave Pool address: ${AAVE_CONTRACTS.pool}
Collateral token: ${collateralAddress}
Borrow token: ${borrowAddress}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  // Parse Claude's response
  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    emitEvent("error", { message: "No text response from agent" });
    return null;
  }

  let evaluation;
  try {
    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    evaluation = JSON.parse(jsonMatch[0]);
  } catch {
    // If JSON parsing fails, construct from text
    emitEvent("thinking", {
      step: "Parsing agent response...",
      raw: textContent.text,
    });

    // Simple heuristic fallback
    const collateralValue =
      parseFloat(collateralAmount) * parseFloat(collateralPrice);
    const borrowValue = parseFloat(borrowAmount) * parseFloat(borrowPrice);
    const projectedHF = collateralValue > 0 ? (collateralValue * 0.825) / borrowValue : 0;

    let riskScore: RiskScore = "LOW";
    if (projectedHF < 1.0) riskScore = "BLOCKED";
    else if (projectedHF < 1.5) riskScore = "HIGH";
    else if (projectedHF < 2.0) riskScore = "MEDIUM";

    evaluation = {
      thinking: ["Calculated projected health factor from collateral and borrow values"],
      riskScore,
      healthFactor: projectedHF.toFixed(2),
      collateralRatio: `${((collateralValue / borrowValue) * 100).toFixed(0)}%`,
      liquidationPrice: `$${((borrowValue / (parseFloat(collateralAmount) * 0.825)) ).toFixed(2)}`,
      reasoning: textContent.text.slice(0, 500),
      proceed: projectedHF >= 1.0,
      transactions: [],
    };
  }

  // Emit thinking steps
  if (evaluation.thinking) {
    for (const step of evaluation.thinking) {
      emitEvent("thinking", { step });
    }
  }

  // Emit risk assessment
  emitEvent("risk_assessment", {
    score: evaluation.riskScore,
    healthFactor: evaluation.healthFactor,
    collateralRatio: evaluation.collateralRatio,
    liquidationPrice: evaluation.liquidationPrice,
    reasoning: evaluation.reasoning,
  });

  // Check guardrails
  if (evaluation.riskScore === "BLOCKED" || !evaluation.proceed) {
    emitEvent("guardrail_blocked", {
      reason: evaluation.reasoning,
      healthFactor: evaluation.healthFactor,
    });
    return { blocked: true, evaluation };
  }

  return { blocked: false, evaluation };
}
