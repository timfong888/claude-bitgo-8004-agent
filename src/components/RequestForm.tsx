"use client";

import { useState } from "react";
import type { BorrowRequest, TokenSymbol } from "@/types";
import { ArchitectureLabel } from "./ArchitectureLabel";

const COLLATERAL_TOKENS: TokenSymbol[] = ["WETH"];
const BORROW_TOKENS: TokenSymbol[] = ["USDC"];

interface Props {
  onSubmit: (request: BorrowRequest) => void;
  disabled: boolean;
}

export function RequestForm({ onSubmit, disabled }: Props) {
  const [collateralToken, setCollateralToken] = useState<string>("WETH");
  const [collateralAmount, setCollateralAmount] = useState("0.5");
  const [borrowToken, setBorrowToken] = useState<string>("USDC");
  const [borrowAmount, setBorrowAmount] = useState("500");
  const [walletAddress, setWalletAddress] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      collateralToken,
      collateralAmount,
      borrowToken,
      borrowAmount,
      walletAddress: walletAddress || "0x0000000000000000000000000000000000000000",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <ArchitectureLabel owner="user" />
        <h2 className="text-lg font-semibold">Borrow Request</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Collateral Token
          </label>
          <select
            value={collateralToken}
            onChange={(e) => setCollateralToken(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            disabled={disabled}
            data-testid="collateral-token"
          >
            {COLLATERAL_TOKENS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Collateral Amount
          </label>
          <input
            type="text"
            value={collateralAmount}
            onChange={(e) => setCollateralAmount(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            placeholder="0.5"
            disabled={disabled}
            data-testid="collateral-amount"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Borrow Token
          </label>
          <select
            value={borrowToken}
            onChange={(e) => setBorrowToken(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            disabled={disabled}
            data-testid="borrow-token"
          >
            {BORROW_TOKENS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Borrow Amount
          </label>
          <input
            type="text"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            placeholder="500"
            disabled={disabled}
            data-testid="borrow-amount"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Wallet Address (optional for demo)
        </label>
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-mono"
          placeholder="0x..."
          disabled={disabled}
          data-testid="wallet-address"
        />
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        data-testid="submit-request"
      >
        {disabled ? "Evaluating..." : "Submit Borrow Request"}
      </button>
    </form>
  );
}
