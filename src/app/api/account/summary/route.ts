import { NextResponse } from "next/server";
import { getWallet } from "@/lib/bitgo";
import { getUserAccountData, getPublicClient, AAVE_CONTRACTS, TOKENS } from "@/lib/aave";
import { formatUnits, parseAbi } from "viem";

const POOL_ABI = parseAbi([
  "function collateralPriceUSD() view returns (uint256)",
  "function borrowPriceUSD() view returns (uint256)",
]);

export async function GET() {
  // Fetch BitGo wallet and Aave position in parallel
  const [walletResult, priceResult] = await Promise.allSettled([
    getWallet(),
    (async () => {
      const client = getPublicClient();
      const [colPrice, borPrice] = await Promise.all([
        client.readContract({ address: AAVE_CONTRACTS.pool, abi: POOL_ABI, functionName: "collateralPriceUSD" }),
        client.readContract({ address: AAVE_CONTRACTS.pool, abi: POOL_ABI, functionName: "borrowPriceUSD" }),
      ]);
      return {
        collateralPriceUSD: formatUnits(colPrice, 8),
        borrowPriceUSD: formatUnits(borPrice, 8),
      };
    })(),
  ]);

  // Wallet
  let wallet = { label: "", address: "", coin: "", balanceETH: "0" };
  let aaveAddress: `0x${string}` | null = null;

  if (walletResult.status === "fulfilled") {
    const w = walletResult.value;
    const addr = w.receiveAddress?.address || w.coinSpecific?.baseAddress || "";
    const balWei = w.balanceString || w.balance || "0";
    wallet = {
      label: w.label || "BitGo Custody Wallet",
      address: addr,
      coin: w.coin || "",
      balanceETH: (Number(balWei) / 1e18).toFixed(6),
    };
    if (addr) aaveAddress = addr as `0x${string}`;
  }

  // Aave position (use wallet address if available)
  let position = { totalCollateralUSD: "0", totalDebtUSD: "0", healthFactor: "0", ltv: 0 };
  if (aaveAddress) {
    try {
      position = await getUserAccountData(aaveAddress);
    } catch {
      // No position yet — defaults are fine
    }
  }

  // Prices
  let prices = { collateralPriceUSD: "2500", borrowPriceUSD: "1" };
  if (priceResult.status === "fulfilled") {
    prices = priceResult.value;
  }

  return NextResponse.json({
    wallet,
    position,
    prices,
    ltv: 0.825,
    liquidationThreshold: 0.86,
    tokens: { WETH: TOKENS.WETH, USDC: TOKENS.USDC },
  });
}
