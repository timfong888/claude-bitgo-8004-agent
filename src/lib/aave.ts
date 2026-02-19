import { createPublicClient, http, parseAbi, formatUnits } from "viem";
import { sepolia } from "viem/chains";
import type { TokenSymbol } from "@/types";

// Aave V3 Sepolia contract addresses
export const AAVE_CONTRACTS = {
  pool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951" as const,
  poolDataProvider: "0x3e9708d80f7B3e43118013075F7e95CE3AB31F31" as const,
  oracle: "0x2da88497588bf89281816106C7259e31AF45a663" as const,
  poolAddressesProvider:
    "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A" as const,
};

export const TOKENS = {
  WETH: "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c" as const,
  USDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" as const,
  DAI: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357" as const,
  WBTC: "0x29f2D40B0605204364af54EC677bD022dA425d03" as const,
  USDT: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0" as const,
  GHO: "0xc4bF5CbDaBE595361438F8c6a187bDc330539c60" as const,
} as const;

// Decimals per token
export const TOKEN_DECIMALS: Record<TokenSymbol, number> = {
  WETH: 18,
  USDC: 6,
  DAI: 18,
  WBTC: 8,
  USDT: 6,
  GHO: 18,
};

const POOL_ABI = parseAbi([
  "function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)",
]);

const ORACLE_ABI = parseAbi([
  "function getAssetPrice(address asset) view returns (uint256)",
]);

const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

export function getPublicClient() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
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
  const price = await client.readContract({
    address: AAVE_CONTRACTS.oracle,
    abi: ORACLE_ABI,
    functionName: "getAssetPrice",
    args: [asset],
  });
  // Aave oracle returns price in base currency units (8 decimals for USD)
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

// Encode supply calldata for the agent to submit via BitGo
export function encodeSupplyCalldata(
  asset: `0x${string}`,
  amount: bigint,
  onBehalfOf: `0x${string}`
) {
  const { encodeFunctionData } = require("viem");
  return encodeFunctionData({
    abi: POOL_ABI,
    functionName: "supply",
    args: [asset, amount, onBehalfOf, 0],
  });
}

// Encode borrow calldata
export function encodeBorrowCalldata(
  asset: `0x${string}`,
  amount: bigint,
  onBehalfOf: `0x${string}`
) {
  const { encodeFunctionData } = require("viem");
  return encodeFunctionData({
    abi: POOL_ABI,
    functionName: "borrow",
    args: [asset, amount, 2n, 0, onBehalfOf], // 2 = variable rate
  });
}

// Encode ERC20 approve calldata
export function encodeApproveCalldata(
  spender: `0x${string}`,
  amount: bigint
) {
  const { encodeFunctionData } = require("viem");
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spender, amount],
  });
}

export { POOL_ABI, ORACLE_ABI, ERC20_ABI };
