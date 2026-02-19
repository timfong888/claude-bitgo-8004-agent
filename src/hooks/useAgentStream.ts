"use client";

import { useState, useCallback, useRef } from "react";
import type { AgentEvent, BorrowRequest, TransactionState } from "@/types";

const INITIAL_STATE: TransactionState = {
  phase: "idle",
  events: [],
};

export function useAgentStream() {
  const [state, setState] = useState<TransactionState>(INITIAL_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setState(INITIAL_STATE);
    setIsLoading(false);
  }, []);

  const evaluate = useCallback(async (request: BorrowRequest) => {
    // Reset state
    setState({ phase: "evaluating", events: [] });
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/agent/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);

          try {
            const event: AgentEvent = JSON.parse(jsonStr);

            setState((prev) => {
              const newEvents = [...prev.events, event];
              let newPhase = prev.phase;

              // Update phase based on event type
              switch (event.type) {
                case "thinking":
                  newPhase = "evaluating";
                  break;
                case "risk_assessment":
                  newPhase = "risk_assessed";
                  break;
                case "guardrail_blocked":
                  newPhase = "blocked";
                  break;
                case "transaction_submitted":
                  newPhase = "pending_approval";
                  break;
                case "approval_status":
                  if (event.data.state === "approved") newPhase = "approved";
                  break;
                case "complete":
                  if (prev.phase !== "blocked") newPhase = "confirmed";
                  break;
                case "error":
                  newPhase = "error";
                  break;
              }

              return {
                ...prev,
                phase: newPhase,
                events: newEvents,
                riskAssessment:
                  event.type === "risk_assessment"
                    ? {
                        score: String(event.data.score) as TransactionState["riskAssessment"] extends undefined ? never : NonNullable<TransactionState["riskAssessment"]>["score"],
                        healthFactor: String(event.data.healthFactor),
                        collateralRatio: String(event.data.collateralRatio),
                        liquidationPrice: String(event.data.liquidationPrice),
                        reasoning: String(event.data.reasoning),
                      }
                    : prev.riskAssessment,
                pendingApprovalId:
                  event.type === "transaction_submitted"
                    ? String(event.data.pendingApprovalId || "")
                    : prev.pendingApprovalId,
                txRequestId:
                  event.type === "transaction_submitted"
                    ? String(event.data.txRequestId || "")
                    : prev.txRequestId,
                error:
                  event.type === "error"
                    ? String(event.data.message)
                    : prev.error,
              };
            });
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setState((prev) => ({
          ...prev,
          phase: "error",
          error: (error as Error).message,
        }));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { state, isLoading, evaluate, reset };
}
