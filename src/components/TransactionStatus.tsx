"use client";

import { FLOW_STEPS, type TransactionState } from "@/types";
import { ArchitectureLabel } from "./ArchitectureLabel";

interface Props {
  state: TransactionState;
}

function getStepStatus(
  stepPhase: string,
  currentPhase: string
): "completed" | "active" | "upcoming" {
  const phaseOrder = [
    "idle",
    "evaluating",
    "risk_assessed",
    "submitting",
    "pending_approval",
    "approved",
    "broadcasting",
    "confirmed",
  ];
  const stepIdx = phaseOrder.indexOf(stepPhase);
  const currentIdx = phaseOrder.indexOf(currentPhase);

  if (currentPhase === "blocked" || currentPhase === "error") {
    // Show steps up to where we got blocked as completed
    if (stepPhase === "evaluating") return "completed";
    if (stepPhase === "risk_assessed") return "active";
    return "upcoming";
  }

  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) return "active";
  return "upcoming";
}

export function TransactionStatus({ state }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Transaction Lifecycle</h2>
      <div className="space-y-1">
        {FLOW_STEPS.map((step, i) => {
          const status = getStepStatus(step.phase, state.phase);
          return (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                status === "active"
                  ? "bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800"
                  : status === "completed"
                    ? "bg-emerald-50/50 dark:bg-emerald-950/10"
                    : "opacity-40"
              }`}
            >
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {status === "completed" && (
                  <span className="text-emerald-500 text-sm">&#10003;</span>
                )}
                {status === "active" && (
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                )}
                {status === "upcoming" && (
                  <span className="inline-block w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{step.label}</span>
                  <ArchitectureLabel owner={step.owner} />
                </div>
                {status === "active" && (
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {state.phase === "blocked" && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400" data-testid="tx-status">
          Transaction blocked by agent guardrails
        </div>
      )}

      {state.txHash && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 p-3" data-testid="tx-status">
          <p className="text-sm font-medium text-emerald-700">Confirmed</p>
          <a
            href={`https://sepolia.etherscan.io/tx/${state.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-emerald-600 hover:underline"
          >
            {state.txHash}
          </a>
        </div>
      )}
    </div>
  );
}
