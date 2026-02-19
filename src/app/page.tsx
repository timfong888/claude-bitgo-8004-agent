"use client";

import { RequestForm } from "@/components/RequestForm";
import { AgentReasoning } from "@/components/AgentReasoning";
import { TransactionStatus } from "@/components/TransactionStatus";
import { useAgentStream } from "@/hooks/useAgentStream";

export default function Home() {
  const { state, isLoading, evaluate, reset } = useAgentStream();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              DeFi Custody Agent
            </h1>
            <p className="text-sm text-zinc-500">
              Anthropic AI + BitGo Custody + Aave V3
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 px-3 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              Sepolia Testnet
            </span>
            {state.phase !== "idle" && (
              <button
                onClick={reset}
                className="text-sm text-zinc-500 hover:text-zinc-700 underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Architecture overview banner */}
        <div className="mb-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            How It Works
          </h2>
          <div className="flex items-center justify-between text-center text-sm gap-2">
            <div className="flex-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3">
              <p className="font-medium text-emerald-800 dark:text-emerald-300">You</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                Submit borrow request
              </p>
            </div>
            <span className="text-zinc-300">&#8594;</span>
            <div className="flex-1 rounded-lg bg-violet-50 dark:bg-violet-950/20 p-3">
              <p className="font-medium text-violet-800 dark:text-violet-300">Anthropic Agent</p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                Evaluates risk with guardrails
              </p>
            </div>
            <span className="text-zinc-300">&#8594;</span>
            <div className="flex-1 rounded-lg bg-sky-50 dark:bg-sky-950/20 p-3">
              <p className="font-medium text-sky-800 dark:text-sky-300">BitGo Custody</p>
              <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">
                Policy engine + signing
              </p>
            </div>
            <span className="text-zinc-300">&#8594;</span>
            <div className="flex-1 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-950/20 p-3">
              <p className="font-medium text-fuchsia-800 dark:text-fuchsia-300">Aave V3</p>
              <p className="text-xs text-fuchsia-600 dark:text-fuchsia-400 mt-1">
                On-chain execution
              </p>
            </div>
          </div>
        </div>

        {/* Three-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Request Form */}
          <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
            <RequestForm onSubmit={evaluate} disabled={isLoading} />
          </div>

          {/* Center: Agent Reasoning */}
          <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
            <AgentReasoning events={state.events} />
          </div>

          {/* Right: Transaction Status */}
          <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
            <TransactionStatus state={state} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-zinc-400">
          <p>
            Built with Anthropic Agent SDK, BitGo API, Aave V3, Next.js —
            <a
              href="https://github.com/timfong888/claude-bitgo-8004-agent"
              className="underline hover:text-zinc-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Source
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
