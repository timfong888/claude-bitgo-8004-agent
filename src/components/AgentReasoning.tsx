"use client";

import type { AgentEvent } from "@/types";
import { ArchitectureLabel } from "./ArchitectureLabel";

interface Props {
  events: AgentEvent[];
}

function EventIcon({ type }: { type: AgentEvent["type"] }) {
  switch (type) {
    case "thinking":
      return <span className="text-violet-500">&#9679;</span>;
    case "tool_call":
      return <span className="text-blue-500">&#9881;</span>;
    case "risk_assessment":
      return <span className="text-amber-500">&#9888;</span>;
    case "transaction_submitted":
      return <span className="text-sky-500">&#10148;</span>;
    case "approval_status":
      return <span className="text-sky-500">&#9745;</span>;
    case "guardrail_blocked":
      return <span className="text-red-500">&#10006;</span>;
    case "complete":
      return <span className="text-emerald-500">&#10003;</span>;
    case "error":
      return <span className="text-red-500">&#9888;</span>;
    default:
      return <span>&#8226;</span>;
  }
}

function RiskBadge({ score }: { score: string }) {
  const styles: Record<string, string> = {
    LOW: "bg-emerald-100 text-emerald-800",
    MEDIUM: "bg-amber-100 text-amber-800",
    HIGH: "bg-orange-100 text-orange-800",
    BLOCKED: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${styles[score] || "bg-zinc-100 text-zinc-800"}`}
      data-testid="risk-score"
    >
      {score}
    </span>
  );
}

function EventCard({ event }: { event: AgentEvent }) {
  const time = new Date(event.timestamp).toLocaleTimeString();

  if (event.type === "risk_assessment") {
    const d = event.data as Record<string, string>;
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArchitectureLabel owner="agent" />
            <span className="text-sm font-medium">Risk Assessment</span>
          </div>
          <RiskBadge score={d.score} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-zinc-500">Health Factor</span>
            <p className="font-mono font-bold">{d.healthFactor}</p>
          </div>
          <div>
            <span className="text-zinc-500">Collateral Ratio</span>
            <p className="font-mono font-bold">{d.collateralRatio}</p>
          </div>
          <div>
            <span className="text-zinc-500">Liquidation Price</span>
            <p className="font-mono font-bold">{d.liquidationPrice}</p>
          </div>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400" data-testid="agent-reasoning">
          {d.reasoning}
        </p>
      </div>
    );
  }

  if (event.type === "guardrail_blocked") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <ArchitectureLabel owner="agent" />
          <span className="text-sm font-bold text-red-700">BLOCKED BY GUARDRAIL</span>
        </div>
        <p className="text-sm text-red-600">
          {String(event.data.reason)}
        </p>
      </div>
    );
  }

  if (event.type === "transaction_submitted") {
    return (
      <div className="rounded-lg border border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <ArchitectureLabel owner="bitgo" />
          <span className="text-sm font-medium">Transaction Submitted</span>
          {Boolean(event.data.demo) && (
            <span className="text-xs bg-zinc-200 dark:bg-zinc-700 rounded px-1.5 py-0.5">
              Demo
            </span>
          )}
        </div>
        <p className="text-xs font-mono text-zinc-500" data-testid="tx-status">
          Pending Approval — ID: {String(event.data.pendingApprovalId || event.data.txRequestId).slice(0, 20)}...
        </p>
      </div>
    );
  }

  if (event.type === "approval_status") {
    return (
      <div className="rounded-lg border border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-800 p-3">
        <div className="flex items-center gap-2">
          <ArchitectureLabel owner="bitgo" />
          <span className="text-sm">{String(event.data.message)}</span>
        </div>
      </div>
    );
  }

  // Default: thinking / tool_call / complete / error
  return (
    <div className="flex items-start gap-2 text-sm">
      <EventIcon type={event.type} />
      <div className="flex-1 min-w-0">
        <span className="text-zinc-400 text-xs mr-2">{time}</span>
        {event.type === "thinking" && (
          <span data-testid="agent-thinking">{String(event.data.step)}</span>
        )}
        {event.type === "tool_call" && (
          <span className="font-mono text-xs">
            Called: {String(event.data.tool)}
          </span>
        )}
        {event.type === "complete" && (
          <span className="text-emerald-600 font-medium">
            {String(event.data.message)}
          </span>
        )}
        {event.type === "error" && (
          <span className="text-red-600">{String(event.data.message)}</span>
        )}
      </div>
    </div>
  );
}

export function AgentReasoning({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="text-center text-zinc-400 py-12">
        <p className="text-sm">Agent reasoning will appear here</p>
        <p className="text-xs mt-1">Submit a borrow request to start</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <ArchitectureLabel owner="agent" />
        Agent Reasoning
      </h2>
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {events.map((event, i) => (
          <EventCard key={`${event.timestamp}-${i}`} event={event} />
        ))}
      </div>
    </div>
  );
}
