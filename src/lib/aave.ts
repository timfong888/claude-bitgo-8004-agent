import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { sepolia } from "viem/chains";
import type { TokenSymbol } from "@/types";

// MockAavePool contracts deployed on Sepolia
export const AAVE_CONTRACTS = {
  pool: "0xF2574c9D3114D7cb499f499F10341f390F4B00a4" as const,
};

export const TOKENS = {
  WETH: "0xe328164d19df0cf00cc9F8E9EaB0127AD09E5904" as const,
  USDC: "0x399E60192E44215CAC77E2cE64C847C52830f42C" as const,
} as const;

// Only the tokens deployed in our mock
export const TOKEN_DECIMALS: Record<string, number> = {
  WETH: 18,
  USDC: 6,
};

// MockAavePool implements the same function signatures as Aave V3
const POOL_ABI = parseAbi([
  "function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)",
  "function collateralPriceUSD() view returns (uint256)",
  "function borrowPriceUSD() view returns (uint256)",
]);

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

export function getPublicClient() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://sepolia.drpc.org";
  return createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });
}

export async function getUserAccountData(userAddress: `0x${string}`) {
  const client = getPublicClient();
  const result = await client.readContract({
    address: AAVE_CONTRACTS.pool,
    abi: POOL_ABI,
    functionName: "getUserAccountData",
    args: [userAddress],
  });

  const [
    totalCollateralBase,
    totalDebtBase,
    availableBorrowsBase,
    currentLiquidationThreshold,
    ltv,
    healthFactor,
  ] = result;

  return {
    totalCollateralUSD: formatUnits(totalCollateralBase, 8),
    totalDebtUSD: formatUnits(totalDebtBase, 8),
    availableBorrowsUSD: formatUnits(availableBorrowsBase, 8),
    currentLiquidationThreshold: Number(currentLiquidationThreshold) / 10000,
    ltv: Number(ltv) / 10000,
    healthFactor: formatUnits(healthFactor, 18),
  };
}

export async function getAssetPrice(asset: `0x${string}`) {
  const client = getPublicClient();
  // MockAavePool stores prices directly on the contract
  const collateralToken = TOKENS.WETH.toLowerCase();
  const fnName = asset.toLowerCase() === collateralToken
    ? "collateralPriceUSD"
    : "borrowPriceUSD";

  const price = await client.readContract({
    address: AAVE_CONTRACTS.pool,
    abi: POOL_ABI,
    functionName: fnName,
  });
  return formatUnits(price, 8);
}

export async function getTokenBalance(
  token: `0x${string}`,
  owner: `0x${string}`
) {
  const client = getPublicClient();
  const balance = await client.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [owner],
  });
  return balance;
}

export { POOL_ABI, ERC20_ABI };
