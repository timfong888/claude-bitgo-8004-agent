export type TokenSymbol = "WETH" | "USDC";

export interface BorrowRequest {
  collateralToken: string;
  collateralAmount: string;
  borrowToken: string;
  borrowAmount: string;
  walletAddress: string;
}

export type RiskScore = "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";

export type AgentEventType =
  | "thinking"
  | "tool_call"
  | "risk_assessment"
  | "transaction_submitted"
  | "approval_status"
  | "guardrail_blocked"
  | "complete"
  | "error";

export interface AgentEvent {
  type: AgentEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface RiskAssessment {
  score: RiskScore;
  healthFactor: string;
  collateralRatio: string;
  liquidationPrice: string;
  reasoning: string;
}

export interface TransactionState {
  phase:
    | "idle"
    | "evaluating"
    | "risk_assessed"
    | "submitting"
    | "pending_approval"
    | "approved"
    | "broadcasting"
    | "confirmed"
    | "blocked"
    | "error";
  events: AgentEvent[];
  riskAssessment?: RiskAssessment;
  txRequestId?: string;
  pendingApprovalId?: string;
  txHash?: string;
  error?: string;
}

export type StepOwner = "user" | "agent" | "bitgo" | "aave";

export interface FlowStep {
  label: string;
  owner: StepOwner;
  description: string;
  phase: TransactionState["phase"];
}

export const FLOW_STEPS: FlowStep[] = [
  {
    label: "Request",
    owner: "user",
    description: "User submits borrow parameters",
    phase: "idle",
  },
  {
    label: "Risk Evaluation",
    owner: "agent",
    description: "AI agent analyzes health factor, collateral ratio, liquidation risk",
    phase: "evaluating",
  },
  {
    label: "Risk Decision",
    owner: "agent",
    description: "Agent scores risk and decides whether to proceed",
    phase: "risk_assessed",
  },
  {
    label: "Submit to Custody",
    owner: "bitgo",
    description: "Transaction routed to BitGo for policy evaluation",
    phase: "submitting",
  },
  {
    label: "Policy Check",
    owner: "bitgo",
    description: "BitGo policy engine evaluates against rules",
    phase: "pending_approval",
  },
  {
    label: "Human Approval",
    owner: "bitgo",
    description: "Approver reviews and signs in BitGo Verify",
    phase: "approved",
  },
  {
    label: "On-Chain Execution",
    owner: "aave",
    description: "Transaction broadcast and confirmed on Sepolia",
    phase: "confirmed",
  },
];
