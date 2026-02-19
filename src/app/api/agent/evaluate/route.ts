import { NextRequest } from "next/server";
import { evaluateBorrowRequest } from "@/lib/agent";
import { createTransactionRequest } from "@/lib/bitgo";
import type { AgentEvent, BorrowRequest, TokenSymbol } from "@/types";

export const maxDuration = 60; // Allow up to 60s for agent evaluation

export async function POST(request: NextRequest) {
  const body: BorrowRequest = await request.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: AgentEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        // Phase 1: Agent evaluation
        const result = await evaluateBorrowRequest({
          walletAddress: body.walletAddress,
          collateralToken: body.collateralToken as TokenSymbol,
          collateralAmount: body.collateralAmount,
          borrowToken: body.borrowToken as TokenSymbol,
          borrowAmount: body.borrowAmount,
          onEvent: sendEvent,
        });

        if (!result || result.blocked) {
          controller.close();
          return;
        }

        // Phase 2: Submit to BitGo
        sendEvent({
          type: "thinking",
          timestamp: new Date().toISOString(),
          data: { step: "Submitting transaction to BitGo custody..." },
        });

        try {
          const txRequest = await createTransactionRequest({
            to: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951", // Aave Pool
            data: "0x", // Placeholder — real calldata would come from agent
            value: "0",
            comment: `Agent risk score: ${result.evaluation.riskScore} | HF: ${result.evaluation.healthFactor}`,
          });

          sendEvent({
            type: "transaction_submitted",
            timestamp: new Date().toISOString(),
            data: {
              txRequestId: txRequest.txRequestId || txRequest.id,
              pendingApprovalId: txRequest.pendingApprovalId,
              status: txRequest.state || "pending",
            },
          });

          // If there's a pending approval, report it
          if (txRequest.pendingApprovalId) {
            sendEvent({
              type: "approval_status",
              timestamp: new Date().toISOString(),
              data: {
                approvalId: txRequest.pendingApprovalId,
                state: "pending",
                message: "Transaction requires approval in BitGo Verify",
              },
            });
          }
        } catch (bitgoError) {
          // BitGo may not be configured — show demo mode
          sendEvent({
            type: "transaction_submitted",
            timestamp: new Date().toISOString(),
            data: {
              txRequestId: "demo-" + Date.now(),
              pendingApprovalId: "demo-approval-" + Date.now(),
              status: "pending",
              demo: true,
              note: "BitGo testnet not configured — showing demo flow",
            },
          });

          sendEvent({
            type: "approval_status",
            timestamp: new Date().toISOString(),
            data: {
              approvalId: "demo-approval-" + Date.now(),
              state: "pending",
              message:
                "Transaction requires approval in BitGo Verify (demo mode)",
              demo: true,
            },
          });
        }

        sendEvent({
          type: "complete",
          timestamp: new Date().toISOString(),
          data: {
            message: "Evaluation complete. Awaiting BitGo approval.",
          },
        });
      } catch (error) {
        sendEvent({
          type: "error",
          timestamp: new Date().toISOString(),
          data: {
            message:
              error instanceof Error ? error.message : "Unknown error occurred",
          },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
