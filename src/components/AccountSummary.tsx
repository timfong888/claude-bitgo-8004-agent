"use client";

import { useState, useEffect } from "react";

interface AccountData {
  wallet: { label: string; address: string; coin: string; balanceETH: string };
  position: { totalCollateralUSD: string; totalDebtUSD: string; healthFactor: string };
  prices: { collateralPriceUSD: string; borrowPriceUSD: string };
}

export function AccountSummary() {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/account/summary")
      .then((res) => res.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 animate-pulse">
        <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded" />
      </div>
    );
  }

  if (!data || !data.wallet.address) {
    return (
      <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-700 dark:text-amber-400">
        BitGo wallet not connected — running in demo mode
      </div>
    );
  }

  const { wallet, position, prices } = data;
  const collateral = parseFloat(position.totalCollateralUSD);
  const debt = parseFloat(position.totalDebtUSD);
  const hf = parseFloat(position.healthFactor);
  const hasPosition = collateral > 0 || debt > 0;

  const hfDisplay = !hasPosition
    ? "--"
    : hf > 100
      ? ">100"
      : hf.toFixed(2);

  const hfColor = !hasPosition
    ? "text-zinc-400"
    : hf >= 2.0
      ? "text-emerald-600 dark:text-emerald-400"
      : hf >= 1.5
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4">
      {/* Wallet identity row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center rounded-md bg-sky-100 dark:bg-sky-900/30 px-2 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
          BitGo
        </span>
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{wallet.label}</span>
        <span className="text-xs font-mono text-zinc-400 truncate max-w-[200px]">{wallet.address}</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Wallet Balance</div>
          <div className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            {parseFloat(wallet.balanceETH).toFixed(4)}
          </div>
          <div className="text-xs text-zinc-400">{wallet.coin.toUpperCase()}</div>
        </div>

        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Collateral</div>
          <div className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            ${collateral.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-400">supplied to Aave</div>
        </div>

        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Debt</div>
          <div className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            ${debt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-400">USDC borrowed</div>
        </div>

        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Health Factor</div>
          <div className={`text-lg font-semibold ${hfColor}`}>
            {hfDisplay}
          </div>
          <div className="text-xs text-zinc-400">
            {!hasPosition ? "no position" : hf >= 2.0 ? "safe" : hf >= 1.5 ? "caution" : "at risk"}
          </div>
        </div>
      </div>

      {/* WETH price context */}
      <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400">
        WETH ${parseFloat(prices.collateralPriceUSD).toLocaleString()} · USDC ${parseFloat(prices.borrowPriceUSD).toLocaleString()}
      </div>
    </div>
  );
}
