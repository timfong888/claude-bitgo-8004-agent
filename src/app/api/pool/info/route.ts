import { NextResponse } from "next/server";
import { getPublicClient, AAVE_CONTRACTS, POOL_ABI } from "@/lib/aave";
import { formatUnits } from "viem";

export async function GET() {
  try {
    const client = getPublicClient();

    const [collateralPrice, borrowPrice] = await Promise.all([
      client.readContract({
        address: AAVE_CONTRACTS.pool,
        abi: POOL_ABI,
        functionName: "collateralPriceUSD",
      }),
      client.readContract({
        address: AAVE_CONTRACTS.pool,
        abi: POOL_ABI,
        functionName: "borrowPriceUSD",
      }),
    ]);

    return NextResponse.json({
      collateralPriceUSD: formatUnits(collateralPrice, 8),
      borrowPriceUSD: formatUnits(borrowPrice, 8),
      ltv: 0.825,
      liquidationThreshold: 0.86,
    });
  } catch (error) {
    // Fallback values if contract call fails
    return NextResponse.json({
      collateralPriceUSD: "2500",
      borrowPriceUSD: "1",
      ltv: 0.825,
      liquidationThreshold: 0.86,
      fallback: true,
    });
  }
}
