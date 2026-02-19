"use client";

import { useState, useMemo, useEffect } from "react";
import type { BorrowRequest, TokenSymbol } from "@/types";
import { ArchitectureLabel } from "./ArchitectureLabel";
import { usePoolInfo } from "@/hooks/usePoolInfo";

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
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletLabel, setWalletLabel] = useState("");

  const { poolInfo, loading: poolLoading } = usePoolInfo();

  useEffect(() => {
    fetch("/api/bitgo/wallet")
      .then((res) => res.json())
      .then((data) => {
        if (data.address) {
          setWalletAddress(data.address);
          setWalletLabel(data.label || "BitGo Custody Wallet");
        }
      })
      .catch(() => {})
      .finally(() => setWalletLoading(false));
  }, []);

  const borrowMetrics = useMemo(() => {
    if (!poolInfo) return null;
    const colAmt = parseFloat(collateralAmount) || 0;
    const borAmt = parseFloat(borrowAmount) || 0;
    const colPrice = parseFloat(poolInfo.collateralPriceUSD);
    const borPrice = parseFloat(poolInfo.borrowPriceUSD);

    const collateralValueUSD = colAmt * colPrice;
    const maxBorrow = (collateralValueUSD * poolInfo.ltv) / borPrice;
    const borrowValueUSD = borAmt * borPrice;
    const utilization = maxBorrow > 0 ? borrowValueUSD / (collateralValueUSD * poolInfo.ltv) : 0;
    const healthFactor = borrowValueUSD > 0
      ? (collateralValueUSD * poolInfo.liquidationThreshold) / borrowValueUSD
      : Infinity;

    return {
      collateralValueUSD,
      maxBorrow,
      borrowValueUSD,
      utilization,
      healthFactor,
      colPrice,
    };
  }, [collateralAmount, borrowAmount, poolInfo]);

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

  const utilizationColor = (util: number) => {
    if (util <= 0.5) return "text-emerald-600 dark:text-emerald-400";
    if (util <= 0.8) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const healthFactorColor = (hf: number) => {
    if (hf >= 2.0) return "text-emerald-600 dark:text-emerald-400";
    if (hf >= 1.5) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
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

      {/* Market Info & Max Borrow */}
      {borrowMetrics && !poolLoading && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">WETH Price</span>
            <span className="font-medium">${borrowMetrics.colPrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Collateral Value</span>
            <span className="font-medium">${borrowMetrics.collateralValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Max Borrow (LTV {((poolInfo?.ltv ?? 0) * 100).toFixed(1)}%)</span>
            <span className="font-semibold text-violet-600 dark:text-violet-400">
              {borrowMetrics.maxBorrow.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
            </span>
          </div>
          <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Utilization</span>
            <span className={`font-medium ${utilizationColor(borrowMetrics.utilization)}`}>
              {(borrowMetrics.utilization * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Est. Health Factor</span>
            <span className={`font-medium ${healthFactorColor(borrowMetrics.healthFactor)}`}>
              {borrowMetrics.healthFactor === Infinity ? "--" : borrowMetrics.healthFactor.toFixed(2)}
            </span>
          </div>
          {/* Utilization bar */}
          <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 mt-1">
            <div
              className={`h-1.5 rounded-full transition-all ${
                borrowMetrics.utilization <= 0.5
                  ? "bg-emerald-500"
                  : borrowMetrics.utilization <= 0.8
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${Math.min(borrowMetrics.utilization * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {poolLoading && (
        <div className="text-xs text-zinc-400 animate-pulse">Loading market data...</div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Custody Wallet
        </label>
        {walletLoading ? (
          <div className="text-xs text-zinc-400 animate-pulse py-2">Connecting to BitGo...</div>
        ) : walletAddress && walletLabel ? (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-sky-100 dark:bg-sky-900/30 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
                BitGo
              </span>
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{walletLabel}</span>
            </div>
            <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mt-1 truncate" data-testid="wallet-address">
              {walletAddress}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
            <div className="text-xs text-amber-700 dark:text-amber-400">
              BitGo wallet not connected — using demo mode
            </div>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full mt-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-xs font-mono"
              placeholder="0x... (optional)"
              disabled={disabled}
            />
          </div>
        )}
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
