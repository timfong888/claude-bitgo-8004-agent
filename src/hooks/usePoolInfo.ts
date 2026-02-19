"use client";

import { useState, useEffect } from "react";

interface PoolInfo {
  collateralPriceUSD: string;
  borrowPriceUSD: string;
  ltv: number;
  liquidationThreshold: number;
  fallback?: boolean;
}

export function usePoolInfo() {
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pool/info")
      .then((res) => res.json())
      .then((data) => setPoolInfo(data))
      .catch(() =>
        setPoolInfo({
          collateralPriceUSD: "2500",
          borrowPriceUSD: "1",
          ltv: 0.825,
          liquidationThreshold: 0.86,
        })
      )
      .finally(() => setLoading(false));
  }, []);

  return { poolInfo, loading };
}
